/**
 * Game Room - Main multiplayer game room
 * Handles game logic, state synchronization, and player actions
 */
import { Room, Client, Delayed } from '@colyseus/core';
import {
  GameState,
  PlayerState,
  TowerState,
  MonsterState,
  BuildingState,
  VectorSchema,
  GamePhase,
  GameEndReason,
  PLAYER_COLORS,
} from '../schema/index.js';
import { SERVER_CONFIG, PVP_CONFIG, type MapSize } from '../config.js';
import {
  ClientMessage,
  ServerMessage,
  type BuildTowerPayload,
  type UpgradeTowerPayload,
  type SellTowerPayload,
  type SpawnMonsterPayload,
  type CannonFirePayload,
  type CannonSetAutoTargetPayload,
} from '../shared/types/messages.js';
import { TerritoryCalculator } from '../systems/territory/territoryCalculator.js';
import {
  InputValidator,
  TowerMetaRegistry,
  SpawnableMonsterRegistry,
} from '../validation/index.js';
import { TOWER_META, type TowerMetaData } from '../../../shared/config/towerMeta.js';

/**
 * Room options when creating/joining
 */
interface GameRoomOptions {
  mapSize?: MapSize;
  playerName?: string;
  isPrivate?: boolean;
  roomPassword?: string;
}

/**
 * Client metadata
 */
interface ClientMetadata {
  playerId: string;
  playerName: string;
  reconnectToken?: string;
}

export class GameRoom extends Room<GameState> {
  // Game loop
  private gameLoopInterval: Delayed | null = null;
  private readonly tickRate = SERVER_CONFIG.tickRate;
  private readonly tickInterval = 1000 / this.tickRate;

  // Reconnection tracking
  private disconnectedClients: Map<string, { deadline: number; playerState: PlayerState }> =
    new Map();

  // Validation
  private territoryCalc!: TerritoryCalculator;
  private inputValidator!: InputValidator;
  private towerMeta!: TowerMetaRegistry;
  private spawnableMeta!: SpawnableMonsterRegistry;

  /**
   * Room creation
   */
  onCreate(options: GameRoomOptions): void {
    console.log(`[GameRoom] Room created: ${this.roomId}`);

    // Initialize state
    this.setState(new GameState());
    this.state.roomId = this.roomId;

    // Configure map
    const mapSize = options.mapSize || 'medium';
    const mapDimensions = PVP_CONFIG.mapSizes[mapSize];
    this.state.mapConfig.size = mapSize;
    this.state.mapConfig.width = mapDimensions.width;
    this.state.mapConfig.height = mapDimensions.height;

    // Set max clients
    this.maxClients = PVP_CONFIG.maxPlayers;

    // Set auto-dispose timeout
    this.autoDispose = true;

    // Initialize validation subsystem
    this.initValidation();

    // Register message handlers
    this.registerMessageHandlers();

    console.log(`[GameRoom] Map size: ${mapSize} (${mapDimensions.width}x${mapDimensions.height})`);
  }

  /**
   * Initialize validation subsystem
   */
  private initValidation(): void {
    // Territory calculator
    this.territoryCalc = new TerritoryCalculator({ territoryRadius: 100 });

    // Tower metadata registry - populated from shared config
    this.towerMeta = new TowerMetaRegistry();
    // Import all tower metadata from shared config
    for (const [id, meta] of Object.entries(TOWER_META)) {
      this.towerMeta.register(id, meta.price, meta.levelUpArr);
    }

    // Spawnable monster registry
    this.spawnableMeta = new SpawnableMonsterRegistry();
    this.spawnableMeta.register({ monsterId: 'Normal', cost: 20, cooldownTicks: 60, unlockWave: 1 });
    this.spawnableMeta.register({ monsterId: 'Runner', cost: 20, cooldownTicks: 80, unlockWave: 3 });
    this.spawnableMeta.register({ monsterId: 'Ox1', cost: 30, cooldownTicks: 120, unlockWave: 5 });
    this.spawnableMeta.register({ monsterId: 'Bomber1', cost: 40, cooldownTicks: 160, unlockWave: 8 });
    this.spawnableMeta.register({ monsterId: 'Mts', cost: 100, cooldownTicks: 200, unlockWave: 10 });
    this.spawnableMeta.register({ monsterId: 'T800', cost: 1200, cooldownTicks: 600, unlockWave: 15 });

    // Input validator
    this.inputValidator = new InputValidator(
      this.state,
      this.territoryCalc,
      this.towerMeta,
      this.spawnableMeta
    );
  }

  /**
   * Register all client message handlers
   */
  private registerMessageHandlers(): void {
    // Player ready
    this.onMessage(ClientMessage.PLAYER_READY, (client) => {
      this.handlePlayerReady(client);
    });

    this.onMessage(ClientMessage.PLAYER_NOT_READY, (client) => {
      this.handlePlayerNotReady(client);
    });

    // Building actions
    this.onMessage(ClientMessage.BUILD_TOWER, (client, payload: BuildTowerPayload) => {
      this.handleBuildTower(client, payload);
    });

    this.onMessage(ClientMessage.UPGRADE_TOWER, (client, payload: UpgradeTowerPayload) => {
      this.handleUpgradeTower(client, payload);
    });

    this.onMessage(ClientMessage.SELL_TOWER, (client, payload: SellTowerPayload) => {
      this.handleSellTower(client, payload);
    });

    // Spawner actions
    this.onMessage(ClientMessage.SPAWN_MONSTER, (client, payload: SpawnMonsterPayload) => {
      this.handleSpawnMonster(client, payload);
    });

    // Manual cannon actions
    this.onMessage(ClientMessage.CANNON_FIRE, (client, payload: CannonFirePayload) => {
      this.handleCannonFire(client, payload);
    });

    this.onMessage(
      ClientMessage.CANNON_SET_AUTO_TARGET,
      (client, payload: CannonSetAutoTargetPayload) => {
        this.handleCannonSetAutoTarget(client, payload);
      }
    );

    // Game control
    this.onMessage(ClientMessage.SURRENDER, (client) => {
      this.handleSurrender(client);
    });
  }

  /**
   * Player joins the room
   */
  onJoin(client: Client, options: GameRoomOptions): void {
    const playerName = options.playerName || `Player ${this.state.getPlayerCount() + 1}`;
    const playerIndex = this.state.getPlayerCount();

    console.log(`[GameRoom] Player joined: ${playerName} (${client.sessionId})`);

    // Check if this is a reconnection
    const reconnectData = this.disconnectedClients.get(client.sessionId);
    if (reconnectData) {
      this.handleReconnection(client, reconnectData.playerState);
      return;
    }

    // Create new player
    const player = new PlayerState(client.sessionId, playerName, playerIndex);
    player.sessionId = client.sessionId;
    player.color = PLAYER_COLORS[playerIndex];
    player.money = PVP_CONFIG.initialMoney;

    // Set base position
    const basePos = PVP_CONFIG.basePositions[playerIndex];
    player.basePosition = new VectorSchema(
      this.state.mapConfig.width * basePos.xRatio,
      this.state.mapConfig.height * basePos.yRatio
    );

    // Add to state
    this.state.players.set(client.sessionId, player);

    // Store client metadata
    (client as unknown as { metadata: ClientMetadata }).metadata = {
      playerId: client.sessionId,
      playerName: playerName,
    };

    // Notify others
    this.broadcast(ServerMessage.PLAYER_JOINED, {
      playerId: client.sessionId,
      playerName: playerName,
      playerIndex: playerIndex,
    });

    // Create base building for this player
    this.createPlayerBase(player);
  }

  /**
   * Create base building for a player
   */
  private createPlayerBase(player: PlayerState): void {
    const baseId = this.state.generateEntityId('base');
    const base = new BuildingState();
    base.id = baseId;
    base.ownerId = player.id;
    base.buildingType = 'RootBuilding';
    base.isBase = true;
    base.hp = 10000;
    base.maxHp = 10000;
    base.radius = 30;
    base.setPosition(player.basePosition.x, player.basePosition.y);

    this.state.buildings.set(baseId, base);
  }

  /**
   * Player leaves the room
   */
  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;

    console.log(
      `[GameRoom] Player left: ${player.name} (consented: ${consented}, phase: ${this.state.phase})`
    );

    // If game hasn't started, remove player
    if (this.state.phase === GamePhase.WAITING) {
      this.removePlayer(client.sessionId);
      return;
    }

    // If game is in progress
    if (this.state.phase === GamePhase.PLAYING) {
      if (consented) {
        // Player intentionally left - treat as surrender
        this.handlePlayerElimination(client.sessionId, 'surrender');
      } else {
        // Disconnected - allow reconnection
        player.isConnected = false;
        this.state.disconnectedPlayerId = client.sessionId;
        this.state.reconnectDeadline = Date.now() + SERVER_CONFIG.reconnectTimeout;
        this.state.phase = GamePhase.PAUSED;

        // Track disconnected player
        this.disconnectedClients.set(client.sessionId, {
          deadline: this.state.reconnectDeadline,
          playerState: player,
        });

        // Notify others
        this.broadcast(ServerMessage.PLAYER_DISCONNECTED, {
          playerId: client.sessionId,
          reconnectDeadline: this.state.reconnectDeadline,
        });

        // Set timeout for reconnection
        this.clock.setTimeout(() => {
          if (this.disconnectedClients.has(client.sessionId)) {
            console.log(`[GameRoom] Reconnect timeout for: ${player.name}`);
            this.handlePlayerElimination(client.sessionId, 'disconnect_timeout');
            this.disconnectedClients.delete(client.sessionId);
            this.resumeGame();
          }
        }, SERVER_CONFIG.reconnectTimeout);

        // Allow reconnection
        try {
          await this.allowReconnection(client, SERVER_CONFIG.reconnectTimeout / 1000);
        } catch {
          // Reconnection timeout handled above
        }
      }
    }
  }

  /**
   * Handle player reconnection
   */
  private handleReconnection(client: Client, playerState: PlayerState): void {
    console.log(`[GameRoom] Player reconnected: ${playerState.name}`);

    playerState.isConnected = true;
    playerState.sessionId = client.sessionId;

    this.disconnectedClients.delete(client.sessionId);
    this.state.disconnectedPlayerId = '';
    this.state.reconnectDeadline = 0;

    // Notify others
    this.broadcast(ServerMessage.PLAYER_RECONNECTED, {
      playerId: client.sessionId,
    });

    // Resume game if was paused for this player
    if (this.state.phase === GamePhase.PAUSED) {
      this.resumeGame();
    }
  }

  /**
   * Remove a player from the game
   */
  private removePlayer(playerId: string): void {
    // Remove player's base
    this.state.buildings.forEach((building, id) => {
      if (building.ownerId === playerId) {
        this.state.buildings.delete(id);
      }
    });

    // Remove player
    this.state.players.delete(playerId);

    this.broadcast(ServerMessage.PLAYER_LEFT, { playerId });
  }

  /**
   * Handle player elimination
   */
  private handlePlayerElimination(playerId: string, reason: string): void {
    const player = this.state.getPlayer(playerId);
    if (!player) return;

    player.isAlive = false;

    // Remove player's entities
    this.state.towers.forEach((tower, id) => {
      if (tower.ownerId === playerId) {
        this.state.towers.delete(id);
      }
    });

    this.state.buildings.forEach((building, id) => {
      if (building.ownerId === playerId) {
        this.state.buildings.delete(id);
      }
    });

    // Notify
    this.broadcast(ServerMessage.PLAYER_ELIMINATED, {
      playerId,
      reason,
    });

    // Check for game end
    this.checkGameEnd();
  }

  /**
   * Room disposal
   */
  onDispose(): void {
    console.log(`[GameRoom] Room disposed: ${this.roomId}`);
    this.stopGameLoop();
  }

  // ==================== Game Loop ====================

  /**
   * Start the game loop
   */
  private startGameLoop(): void {
    if (this.gameLoopInterval) return;

    this.gameLoopInterval = this.clock.setInterval(() => {
      this.gameTick();
    }, this.tickInterval);

    console.log(`[GameRoom] Game loop started (${this.tickRate} ticks/sec)`);
  }

  /**
   * Stop the game loop
   */
  private stopGameLoop(): void {
    if (this.gameLoopInterval) {
      this.gameLoopInterval.clear();
      this.gameLoopInterval = null;
    }
  }

  /**
   * Main game tick
   */
  private gameTick(): void {
    if (this.state.phase !== GamePhase.PLAYING) return;

    this.state.currentTick++;

    // Update entities
    this.updateMonsters();
    this.updateTowers();
    this.updateBuildings();
    this.updateWave();

    // Check collisions and attacks
    this.processAttacks();
    this.processCollisions();

    // Check game end conditions
    this.checkGameEnd();
  }

  /**
   * Update all monsters
   */
  private updateMonsters(): void {
    this.state.monsters.forEach((monster) => {
      // Update position based on velocity
      monster.position.x += monster.velocity.x;
      monster.position.y += monster.velocity.y;

      // Update status effects
      if (monster.isFrozen && this.state.currentTick >= monster.freezeEndTime) {
        monster.isFrozen = false;
      }
      if (monster.isSlowed && this.state.currentTick >= monster.slowEndTime) {
        monster.isSlowed = false;
      }
    });
  }

  /**
   * Update all towers
   */
  private updateTowers(): void {
    // Tower attacks are processed in processAttacks()
    // This is for tower-specific updates (e.g., rotation, ammo reload)
    this.state.towers.forEach((tower) => {
      if (tower.isManual && tower.currentAmmo < tower.maxAmmo) {
        // Ammo reloading logic would go here
        // This is simplified - actual implementation would track reload ticks
      }
    });
  }

  /**
   * Update all buildings
   */
  private updateBuildings(): void {
    this.state.buildings.forEach((building) => {
      if (building.isSpawner) {
        // Update cooldowns
        building.cooldowns.forEach((cooldown) => {
          if (cooldown.remainingTicks > 0) {
            cooldown.remainingTicks--;
          }
        });
      }
    });
  }

  /**
   * Update wave state
   */
  private updateWave(): void {
    if (!this.state.wave.isWaveActive) {
      this.state.wave.nextWaveTime--;
      if (this.state.wave.nextWaveTime <= 0) {
        this.spawnWave();
      }
    } else {
      // Check if wave is complete
      const neutralMonsters = Array.from(this.state.monsters.values()).filter(
        (m) => m.ownerId === ''
      );
      if (neutralMonsters.length === 0) {
        this.state.wave.isWaveActive = false;
        this.state.wave.nextWaveTime = 200 * this.tickRate; // Next wave in 200 ticks

        this.broadcast(ServerMessage.WAVE_COMPLETED, {
          waveNumber: this.state.wave.currentWave,
        });
      }
    }
  }

  /**
   * Spawn a new wave of neutral monsters
   */
  private spawnWave(): void {
    this.state.wave.currentWave++;
    this.state.wave.isWaveActive = true;

    const waveNumber = this.state.wave.currentWave;
    const monsterCount = Math.floor(5 + waveNumber * 2);
    const alivePlayers = this.state.getAlivePlayers();

    this.broadcast(ServerMessage.WAVE_STARTING, {
      waveNumber,
      monsterCount,
    });

    // Spawn monsters distributed among alive players
    for (let i = 0; i < monsterCount; i++) {
      const targetPlayer = alivePlayers[i % alivePlayers.length];
      if (!targetPlayer) continue;

      const monster = new MonsterState();
      monster.id = this.state.generateEntityId('monster');
      monster.ownerId = ''; // Neutral
      monster.targetPlayerId = targetPlayer.id;
      monster.monsterType = this.getMonsterTypeForWave(waveNumber);
      monster.hp = 100 + waveNumber * 20;
      monster.maxHp = monster.hp;
      monster.radius = 10;
      monster.speed = 2;

      // Spawn from map edge, heading toward target player's base
      const spawnPos = this.getEdgeSpawnPosition(targetPlayer);
      monster.setPosition(spawnPos.x, spawnPos.y);

      // Set velocity toward target base
      const dx = targetPlayer.basePosition.x - spawnPos.x;
      const dy = targetPlayer.basePosition.y - spawnPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        monster.setVelocity((dx / dist) * monster.speed, (dy / dist) * monster.speed);
      }

      this.state.monsters.set(monster.id, monster);
    }

    this.state.wave.monstersRemaining = monsterCount;
  }

  /**
   * Get monster type based on wave number
   */
  private getMonsterTypeForWave(waveNumber: number): string {
    if (waveNumber >= 15) return 'T800';
    if (waveNumber >= 10) return 'Ninja';
    if (waveNumber >= 8) return 'Bomber';
    if (waveNumber >= 5) return 'Tank';
    if (waveNumber >= 3) return 'Fast';
    return 'Normal';
  }

  /**
   * Get spawn position from map edge
   */
  private getEdgeSpawnPosition(targetPlayer: PlayerState): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const margin = 50;

    switch (edge) {
      case 0: // Top
        return { x: Math.random() * this.state.mapConfig.width, y: -margin };
      case 1: // Right
        return { x: this.state.mapConfig.width + margin, y: Math.random() * this.state.mapConfig.height };
      case 2: // Bottom
        return { x: Math.random() * this.state.mapConfig.width, y: this.state.mapConfig.height + margin };
      default: // Left
        return { x: -margin, y: Math.random() * this.state.mapConfig.height };
    }
  }

  /**
   * Process tower attacks
   */
  private processAttacks(): void {
    // This is a simplified version - actual implementation would need
    // to integrate with the game's combat system
    this.state.towers.forEach((tower) => {
      if (tower.isManual) return; // Manual towers don't auto-attack

      // Find enemies in range
      this.state.monsters.forEach((monster) => {
        const dist = tower.position.distanceTo(monster.position);
        if (dist <= tower.attackRadius) {
          // Check if enemy
          if (this.isEnemy(tower.ownerId, monster.ownerId)) {
            // Simplified damage - actual implementation would use tower stats
            this.damageMonster(monster, 10, tower.id);
          }
        }
      });
    });
  }

  /**
   * Process collisions
   */
  private processCollisions(): void {
    // Monster vs Building collisions
    this.state.monsters.forEach((monster) => {
      this.state.buildings.forEach((building) => {
        if (this.isEnemy(monster.ownerId, building.ownerId)) {
          const dist = monster.position.distanceTo(building.position);
          if (dist <= monster.radius + building.radius) {
            // Monster attacks building
            this.damageBuilding(building, 5, monster.id);

            // Remove monster after clash
            this.removeMonster(monster.id);
          }
        }
      });
    });
  }

  /**
   * Check if two entities are enemies
   */
  private isEnemy(ownerId1: string, ownerId2: string): boolean {
    // Neutral entities (empty ownerId) are enemies to everyone
    if (ownerId1 === '' || ownerId2 === '') return true;
    return ownerId1 !== ownerId2;
  }

  /**
   * Damage a monster
   */
  private damageMonster(monster: MonsterState, damage: number, sourceId: string): void {
    monster.hp -= damage;

    this.broadcast(ServerMessage.MONSTER_DAMAGED, {
      monsterId: monster.id,
      damage,
      sourceId,
    });

    if (monster.hp <= 0) {
      this.killMonster(monster, sourceId);
    }
  }

  /**
   * Kill a monster
   */
  private killMonster(monster: MonsterState, killerId: string): void {
    // Award money to killer
    const killerTower = this.state.towers.get(killerId);
    if (killerTower && killerTower.ownerId) {
      const player = this.state.getPlayer(killerTower.ownerId);
      if (player) {
        const reward = this.getMonsterReward(monster.monsterType);
        player.money += reward;
        player.monstersKilled++;

        this.broadcast(ServerMessage.MONSTER_KILLED, {
          monsterId: monster.id,
          killerId,
          reward,
        });
      }
    }

    this.removeMonster(monster.id);
  }

  /**
   * Get monster kill reward
   */
  private getMonsterReward(monsterType: string): number {
    const rewards: Record<string, number> = {
      Normal: 10,
      Fast: 10,
      Tank: 15,
      Bomber: 20,
      Ninja: 50,
      T800: 600,
    };
    return rewards[monsterType] || 10;
  }

  /**
   * Remove a monster from state
   */
  private removeMonster(monsterId: string): void {
    this.state.monsters.delete(monsterId);
    if (this.state.wave.isWaveActive) {
      this.state.wave.monstersRemaining--;
    }
  }

  /**
   * Damage a building
   */
  private damageBuilding(building: BuildingState, damage: number, sourceId: string): void {
    building.hp -= damage;

    this.broadcast(ServerMessage.BUILDING_DAMAGED, {
      buildingId: building.id,
      damage,
      sourceId,
    });

    if (building.hp <= 0) {
      this.destroyBuilding(building, sourceId);
    }
  }

  /**
   * Destroy a building
   */
  private destroyBuilding(building: BuildingState, sourceId: string): void {
    this.broadcast(ServerMessage.BUILDING_DESTROYED, {
      buildingId: building.id,
      sourceId,
      wasBase: building.isBase,
    });

    // If this was a base, eliminate the player
    if (building.isBase && building.ownerId) {
      this.handlePlayerElimination(building.ownerId, 'base_destroyed');
    }

    this.state.buildings.delete(building.id);
  }

  /**
   * Check if game has ended
   */
  private checkGameEnd(): void {
    const alivePlayers = this.state.getAlivePlayers();

    if (alivePlayers.length === 1) {
      this.endGame(alivePlayers[0].id, GameEndReason.LAST_STANDING);
    } else if (alivePlayers.length === 0) {
      this.endGame('', GameEndReason.DRAW);
    }
  }

  /**
   * End the game
   */
  private endGame(winnerId: string, reason: string): void {
    this.state.phase = GamePhase.ENDED;
    this.state.winnerId = winnerId;
    this.state.endReason = reason;

    this.stopGameLoop();

    // Collect stats
    const stats = Array.from(this.state.players.values()).map((p) => ({
      playerId: p.id,
      towersBuilt: p.towersBuilt,
      monstersKilled: p.monstersKilled,
      monstersSpawned: p.monstersSpawned,
    }));

    this.broadcast(ServerMessage.GAME_ENDED, {
      winnerId,
      reason,
      stats,
    });

    console.log(`[GameRoom] Game ended. Winner: ${winnerId}, Reason: ${reason}`);
  }

  /**
   * Resume game from pause
   */
  private resumeGame(): void {
    if (this.state.phase !== GamePhase.PAUSED) return;

    this.state.phase = GamePhase.PLAYING;
    this.broadcast(ServerMessage.GAME_RESUMED, {});
  }

  // ==================== Message Handlers ====================

  /**
   * Handle player ready
   */
  private handlePlayerReady(client: Client): void {
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;

    player.isReady = true;

    // Check if all players are ready to start
    if (this.state.canStart()) {
      this.startCountdown();
    }
  }

  /**
   * Handle player not ready
   */
  private handlePlayerNotReady(client: Client): void {
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;

    player.isReady = false;
  }

  /**
   * Start game countdown
   */
  private startCountdown(): void {
    if (this.state.phase !== GamePhase.WAITING) return;

    this.state.phase = GamePhase.STARTING;
    this.state.countdownTicks = 3 * this.tickRate; // 3 second countdown

    this.broadcast(ServerMessage.GAME_STARTING, {
      countdownSeconds: 3,
    });

    // Countdown timer
    const countdownInterval = this.clock.setInterval(() => {
      this.state.countdownTicks -= this.tickRate;

      if (this.state.countdownTicks <= 0) {
        countdownInterval.clear();
        this.startGame();
      }
    }, 1000);
  }

  /**
   * Start the actual game
   */
  private startGame(): void {
    this.state.phase = GamePhase.PLAYING;
    this.state.startTime = Date.now();
    this.state.currentTick = 0;
    this.state.wave.nextWaveTime = 5 * this.tickRate; // First wave in 5 seconds

    this.broadcast(ServerMessage.GAME_STARTED, {});

    this.startGameLoop();

    console.log(`[GameRoom] Game started with ${this.state.getPlayerCount()} players`);
  }

  /**
   * Handle build tower
   */
  private handleBuildTower(client: Client, payload: BuildTowerPayload): void {
    // Ensure territory is up-to-date
    this.territoryCalc.recalculate(this.state.buildings, this.state.towers);

    // Validate with InputValidator
    const result = this.inputValidator.validateBuildTower(
      client.sessionId,
      payload.towerType,
      payload.x,
      payload.y
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'BUILD_TOWER', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    const player = this.state.getPlayer(client.sessionId)!;
    const cost = result.data?.cost as number;

    // Deduct money
    player.money -= cost;

    // Create tower
    const tower = new TowerState();
    tower.id = this.state.generateEntityId('tower');
    tower.ownerId = client.sessionId;
    tower.towerType = payload.towerType;
    tower.setPosition(payload.x, payload.y);
    tower.hp = 1000;
    tower.maxHp = 1000;
    tower.radius = 15;
    tower.attackRadius = 200;

    this.state.towers.set(tower.id, tower);
    player.towersBuilt++;

    // Mark territory dirty for recalculation
    this.territoryCalc.markDirty();

    console.log(
      `[GameRoom] Tower built: ${payload.towerType} at (${payload.x}, ${payload.y}) by ${player.name} (cost: ${cost})`
    );
  }

  /**
   * Handle upgrade tower
   */
  private handleUpgradeTower(client: Client, payload: UpgradeTowerPayload): void {
    // Validate targetType is provided
    if (!payload.targetType) {
      this.sendActionRejected(client, 'UPGRADE_TOWER', 'Missing target type', 'MISSING_TARGET_TYPE');
      return;
    }

    // Full validation using InputValidator
    const result = this.inputValidator.validateUpgradeTower(
      client.sessionId,
      payload.towerId,
      payload.targetType
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'UPGRADE_TOWER', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    // Get tower and player (validated above)
    const tower = this.state.towers.get(payload.towerId)!;
    const player = this.state.getPlayer(client.sessionId)!;
    const upgradeCost = result.data?.cost as number;

    // Deduct money
    player.money -= upgradeCost;

    // Upgrade tower: change type and increment level
    tower.towerType = payload.targetType;
    tower.level++;

    // Update tower stats based on new type if needed
    const targetMeta = this.towerMeta.get(payload.targetType);
    if (targetMeta) {
      // Could update other stats here (radius, attackRadius, etc.) based on config
    }

    console.log(
      `[GameRoom] Tower upgraded: ${tower.id} -> ${payload.targetType} by ${player.name} (cost: ${upgradeCost})`
    );
  }

  /**
   * Handle sell tower
   */
  private handleSellTower(client: Client, payload: SellTowerPayload): void {
    const result = this.inputValidator.validateSellTower(
      client.sessionId,
      payload.towerId
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'SELL_TOWER', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    const player = this.state.getPlayer(client.sessionId)!;
    const refund = result.data?.refund as number;

    // Refund money
    player.money += refund;

    // Remove tower
    this.state.towers.delete(payload.towerId);

    // Mark territory dirty
    this.territoryCalc.markDirty();

    console.log(`[GameRoom] Tower sold: ${payload.towerId} by ${player.name} (refund: ${refund})`);
  }

  /**
   * Handle spawn monster
   */
  private handleSpawnMonster(client: Client, payload: SpawnMonsterPayload): void {
    // Ensure territory is up-to-date
    this.territoryCalc.recalculate(this.state.buildings, this.state.towers);

    const result = this.inputValidator.validateSpawnMonster(
      client.sessionId,
      payload.spawnerId,
      payload.monsterType,
      payload.targetPlayerId
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'SPAWN_MONSTER', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    const player = this.state.getPlayer(client.sessionId)!;
    const spawner = this.state.buildings.get(payload.spawnerId)!;
    const targetPlayer = this.state.getPlayer(payload.targetPlayerId)!;
    const cost = result.data?.cost as number;
    const cooldownTicks = result.data?.cooldownTicks as number;

    // Deduct money
    player.money -= cost;

    // Create monster
    const monster = new MonsterState();
    monster.id = this.state.generateEntityId('monster');
    monster.ownerId = client.sessionId;
    monster.targetPlayerId = payload.targetPlayerId;
    monster.monsterType = payload.monsterType;
    monster.hp = 100; // Simplified
    monster.maxHp = 100;
    monster.radius = 10;
    monster.speed = 2;

    // Spawn at target's territory edge
    const spawnPos = this.getEdgeSpawnPosition(targetPlayer);
    monster.setPosition(spawnPos.x, spawnPos.y);

    // Set velocity toward target base
    const dx = targetPlayer.basePosition.x - spawnPos.x;
    const dy = targetPlayer.basePosition.y - spawnPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      monster.setVelocity((dx / dist) * monster.speed, (dy / dist) * monster.speed);
    }

    this.state.monsters.set(monster.id, monster);
    player.monstersSpawned++;

    // Set cooldown using validated config
    spawner.setCooldown(payload.monsterType, cooldownTicks, cooldownTicks);

    console.log(
      `[GameRoom] Monster spawned: ${payload.monsterType} by ${player.name} targeting ${targetPlayer.name} (cost: ${cost})`
    );
  }

  /**
   * Handle cannon fire
   */
  private handleCannonFire(client: Client, payload: CannonFirePayload): void {
    const result = this.inputValidator.validateCannonFire(
      client.sessionId,
      payload.towerId,
      payload.targetX,
      payload.targetY
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'CANNON_FIRE', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    const tower = this.state.towers.get(payload.towerId)!;
    tower.currentAmmo--;

    // TODO: Create projectile and process hit
    // This would integrate with the game's bullet system

    console.log(`[GameRoom] Cannon fired at (${payload.targetX}, ${payload.targetY})`);
  }

  /**
   * Handle cannon set auto target
   */
  private handleCannonSetAutoTarget(client: Client, payload: CannonSetAutoTargetPayload): void {
    const tower = this.state.towers.get(payload.towerId);
    if (!tower || tower.ownerId !== client.sessionId || !tower.isManual) {
      this.sendError(client, 'INVALID_CANNON', 'Cannot set target: invalid cannon');
      return;
    }

    // TODO: Store auto-target settings
    console.log(
      `[GameRoom] Cannon auto-target set at (${payload.targetX}, ${payload.targetY}) radius ${payload.radius}`
    );
  }

  /**
   * Handle surrender
   */
  private handleSurrender(client: Client): void {
    const player = this.state.getPlayer(client.sessionId);
    if (!player || !player.isAlive) return;

    console.log(`[GameRoom] Player surrendered: ${player.name}`);
    this.handlePlayerElimination(client.sessionId, 'surrender');
  }

  /**
   * Send error to client
   */
  private sendError(client: Client, code: string, message: string): void {
    client.send(ServerMessage.ERROR, { code, message });
  }

  /**
   * Send action rejected to client
   */
  private sendActionRejected(client: Client, action: string, reason: string, errorCode?: string): void {
    client.send(ServerMessage.ACTION_REJECTED, { action, reason, errorCode });
  }
}
