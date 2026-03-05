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
  type BuildBuildingPayload,
  type UpgradeTowerPayload,
  type SellTowerPayload,
  type SpawnMonsterPayload,
  type CannonFirePayload,
  type CannonSetAutoTargetPayload,
  type UpgradeMinePayload,
  type RepairMinePayload,
  type DowngradeMinePayload,
  type SellMinePayload,
  type UpgradeVisionPayload,
  type TerritorySyncPayload,
} from '../shared/types/messages.js';
import { TerritoryCalculator, type TerritoryResult } from '../systems/territory/territoryCalculator.js';
import { EnergyCalculator } from '../systems/energy/energyCalculator.js';
import { MineManager } from '../systems/mine/index.js';
import {
  CombatSystem,
  DamageCalculator,
  type BulletHitResult,
  type CombatTickResult,
  type MeleeResult,
} from '../systems/combat/index.js';
import { VisionSystem } from '../systems/vision/visionSystem.js';
import { sendToVisible, sendToEntityOwnerAndVisible } from '../systems/vision/broadcastFilter.js';
import {
  InputValidator,
  TowerMetaRegistry,
  SpawnableMonsterRegistry,
  BuildingMetaRegistry,
} from '../validation/index.js';
import { TOWER_META } from '../../../shared/config/towerMeta.js';
import { BUILDING_META, getBuildingMeta } from '../../../shared/config/buildingMeta.js';
import { TERRITORY_PENALTY } from '../../../shared/config/index.js';
import {
  SPAWNABLE_MONSTER_META,
  getMonstersForWave,
  type MonsterMetaData,
} from '../../../shared/config/monsterMeta.js';
import { getTowerCombatData } from '../../../shared/config/towerCombatMeta.js';
import { getTowerBaseMeta } from '../../../shared/config/towerBaseMeta.js';
import {
  canUpgradeVision,
  getVisionUpgradePrice,
  VisionType,
} from '../../../shared/config/visionMeta.js';

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

export class GameRoom extends Room {
  // State type declaration
  declare state: GameState;
  // Game loop
  private gameLoopInterval: Delayed | null = null;
  private readonly tickRate = SERVER_CONFIG.tickRate;
  private readonly tickInterval = 1000 / this.tickRate;

  // Reconnection tracking
  private disconnectedClients: Map<string, { deadline: number; playerState: PlayerState }> =
    new Map();

  // Validation
  private territoryCalc!: TerritoryCalculator;
  private energyCalc!: EnergyCalculator;
  private combatSystem!: CombatSystem;
  private inputValidator!: InputValidator;
  private towerMeta!: TowerMetaRegistry;
  private spawnableMeta!: SpawnableMonsterRegistry;
  private buildingMeta!: BuildingMetaRegistry;
  private mineManager!: MineManager;
  private visionSystem!: VisionSystem;

  private territorySyncCounter: number = 0;
  private readonly TERRITORY_SYNC_INTERVAL = 120; // Every 2 seconds at 60 ticks/sec

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

    // Energy calculator
    this.energyCalc = new EnergyCalculator();

    // Damage calculator (combines territory + energy)
    const damageCalc = new DamageCalculator(this.territoryCalc, this.energyCalc);

    // Combat system (spatial grids + tower attacks + bullets)
    this.combatSystem = new CombatSystem(
      this.state.mapConfig.width,
      this.state.mapConfig.height,
      damageCalc
    );
    this.combatSystem.initTowerConfigs();

    // Tower metadata registry - populated from shared config
    this.towerMeta = new TowerMetaRegistry();
    for (const [id, meta] of Object.entries(TOWER_META)) {
      this.towerMeta.register(id, meta.price, meta.levelUpArr);
    }

    // Building metadata registry - populated from shared config
    this.buildingMeta = new BuildingMetaRegistry();
    for (const [id, meta] of Object.entries(BUILDING_META)) {
      this.buildingMeta.register(id, meta.price, meta.radius, meta.hp);
    }

    // Spawnable monster registry - populated from shared config
    this.spawnableMeta = new SpawnableMonsterRegistry();
    for (const meta of Object.values(SPAWNABLE_MONSTER_META)) {
      this.spawnableMeta.register({
        monsterId: meta.monsterId,
        cost: meta.cost,
        cooldownTicks: meta.cooldownTicks,
        unlockWave: meta.unlockWave,
      });
    }

    // Input validator
    this.inputValidator = new InputValidator(
      this.state,
      this.territoryCalc,
      this.towerMeta,
      this.spawnableMeta,
      this.buildingMeta
    );

    // Mine manager
    this.mineManager = new MineManager(this.state, this.energyCalc, this.territoryCalc);

    // Vision system (fog of war)
    this.visionSystem = new VisionSystem();
    this.state._visionSystem = this.visionSystem;
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

    this.onMessage(ClientMessage.BUILD_BUILDING, (client, payload: BuildBuildingPayload) => {
      this.handleBuildBuilding(client, payload);
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

    // Mine actions
    this.onMessage(ClientMessage.UPGRADE_MINE, (client, payload: UpgradeMinePayload) => {
      this.handleUpgradeMine(client, payload);
    });

    this.onMessage(ClientMessage.REPAIR_MINE, (client, payload: RepairMinePayload) => {
      this.handleRepairMine(client, payload);
    });

    this.onMessage(ClientMessage.DOWNGRADE_MINE, (client, payload: DowngradeMinePayload) => {
      this.handleDowngradeMine(client, payload);
    });

    this.onMessage(ClientMessage.SELL_MINE, (client, payload: SellMinePayload) => {
      this.handleSellMine(client, payload);
    });

    // Vision actions
    this.onMessage(ClientMessage.UPGRADE_VISION, (client, payload: UpgradeVisionPayload) => {
      this.handleUpgradeVision(client, payload);
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

    // Add to vision system
    this.visionSystem.addPlayer(client.sessionId);

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
  async onLeave(client: Client, consented?: boolean): Promise<void> {
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
    this.state.buildings.forEach((building: BuildingState, id: string) => {
      if (building.ownerId === playerId) {
        this.state.buildings.delete(id);
      }
    });

    // Remove player
    this.state.players.delete(playerId);
    this.visionSystem.removePlayer(playerId);

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
    this.state.towers.forEach((tower: TowerState, id: string) => {
      if (tower.ownerId === playerId) {
        this.state.towers.delete(id);
      }
    });

    this.state.buildings.forEach((building: BuildingState, id: string) => {
      if (building.ownerId === playerId) {
        this.state.buildings.delete(id);
      }
    });

    // Mark territory, energy, and vision dirty after entity removal
    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();

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

  /**
   * Convert TerritoryResult map to the format EnergyCalculator expects:
   * playerId -> Set of valid entity IDs
   */
  private buildValidTerritoryIds(
    territoryResults: Map<string, TerritoryResult>
  ): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const [playerId, territory] of territoryResults) {
      result.set(playerId, territory.validBuildings);
    }
    return result;
  }

  /**
   * Apply territory penalties to all towers
   */
  private applyTerritoryPenalties(): void {
    const results = this.territoryCalc.recalculate(
      this.state.buildings,
      this.state.towers,
      this.state.mines
    );

    this.state.towers.forEach((tower) => {
      const playerResult = results.get(tower.ownerId);
      if (!playerResult) return;

      const isValid = playerResult.validBuildings.has(tower.id);
      if (isValid === tower.inValidTerritory) return;

      tower.inValidTerritory = isValid;

      if (isValid) {
        this.removeTowerPenalty(tower);
      } else {
        this.applyTowerPenalty(tower);
      }
    });
  }

  private applyTowerPenalty(tower: TowerState): void {
    tower.maxHp = Math.round(tower._baseMaxHp * TERRITORY_PENALTY.HP_MULTIPLIER);
    tower.hp = Math.min(tower.hp, tower.maxHp);
    tower.attackRadius = Math.round(tower._baseAttackRadius * TERRITORY_PENALTY.RANGE_MULTIPLIER);
  }

  private removeTowerPenalty(tower: TowerState): void {
    tower.maxHp = tower._baseMaxHp;
    tower.attackRadius = tower._baseAttackRadius;
  }

  /**
   * Apply energy money penalties/bonuses to player states
   */
  private applyEnergyMoneyChanges(moneyChanges: Map<string, number>): void {
    for (const [playerId, change] of moneyChanges) {
      const player = this.state.getPlayer(playerId);
      if (!player || !player.isAlive) continue;
      player.money = Math.max(0, player.money + change);
    }
  }

  private gameTick(): void {
    if (this.state.phase !== GamePhase.PLAYING) return;

    this.state.currentTick++;

    // Phase 1: Entity updates
    this.updateMonsters();
    this.updateTowers();
    this.updateBuildings();
    this.updateWave();
    this.mineManager.updateRepairs();

    // Phase 1.5: Territory + Energy recalculation (dirty flag, O(1) when clean)
    const territoryResults = this.territoryCalc.recalculate(
      this.state.buildings,
      this.state.towers,
      this.state.mines
    );
    const validTerritoryIds = this.buildValidTerritoryIds(territoryResults);

    // Phase 1.5b: Sync mine production to energy calculator
    this.mineManager.syncToEnergyCalc(validTerritoryIds);

    // Phase 1.5c: Energy recalculation
    this.energyCalc.recalculate(
      this.state.towers,
      this.state.buildings,
      validTerritoryIds
    );

    // Phase 1.6: Energy tick (penalties/bonuses, frequency controlled internally)
    const moneyChanges = this.energyCalc.processTick(this.state.currentTick);
    this.applyEnergyMoneyChanges(moneyChanges);

    // Phase 1.7: Sync energy state to PlayerState for client display
    this.syncEnergyToPlayerStates();

    // Phase 1.75: Territory sync (periodic)
    this.syncTerritoryToClients();

    // Phase 1.8: Vision recalculation (fog of war filtering)
    this.updateVision();

    // Phase 2: Combat (DamageCalculator now reads correct satisfactionRatio)
    const combatResult = this.combatSystem.update(
      this.state.currentTick,
      this.state.towers,
      this.state.monsters,
      this.state.buildings
    );
    this.applyCombatResult(combatResult);

    // Phase 2.5: Manual cannon auto-fire
    const autoFireEvents = this.combatSystem.processCannonAutoFire(
      this.state.currentTick,
      this.state.towers
    );
    for (const event of autoFireEvents) {
      sendToVisible(this, this.visionSystem, ServerMessage.BULLET_FIRED, event, event.x, event.y);
    }

    // Phase 3: Monster melee (buildings + mines)
    const meleeResults = this.combatSystem.processMonsterMelee(
      this.state.monsters,
      this.state.buildings,
      this.state.mines
    );
    this.applyMeleeResults(meleeResults);

    // Phase 4: Game end check
    this.checkGameEnd();
  }

  /**
   * Update all monsters
   */
  private updateMonsters(): void {
    this.state.monsters.forEach((monster: MonsterState) => {
      // Save previous position for sweep collision
      monster.prevX = monster.position.x;
      monster.prevY = monster.position.y;

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

      // Burn DoT
      if (monster.burnRate > 0) {
        const burnDamage = monster.maxHp * monster.burnRate;
        monster.hp -= burnDamage;
        if (monster.hp <= 0) {
          this.killMonster(monster, '', monster.burnSourceOwnerId);
        }
      }
    });
  }

  /**
   * Update all towers
   */
  private updateTowers(): void {
    // Tower-specific updates (rotation, ammo reload)
    this.state.towers.forEach((tower: TowerState) => {
      if (tower.isManual && tower.currentAmmo < tower.maxAmmo) {
        // Reload 1 ammo every 120 ticks (~2 seconds at 60fps)
        if (this.state.currentTick % 120 === 0) {
          tower.currentAmmo++;
        }
      }
    });
  }

  /**
   * Update all buildings
   */
  private updateBuildings(): void {
    this.state.buildings.forEach((building: BuildingState) => {
      if (building.isSpawner) {
        // Update cooldowns
        building.cooldowns.forEach((cooldown: { remainingTicks: number }) => {
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
        (m: MonsterState) => m.ownerId === ''
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

      const monsterType = this.getMonsterTypeForWave(waveNumber);
      const meta = SPAWNABLE_MONSTER_META[monsterType];

      const monster = new MonsterState();
      monster.id = this.state.generateEntityId('monster');
      monster.ownerId = ''; // Neutral
      monster.targetPlayerId = targetPlayer.id;
      monster.monsterType = monsterType;

      // Use metadata for base stats, scale HP with wave
      monster.hp = (meta?.baseHp ?? 100) + waveNumber * 20;
      monster.maxHp = monster.hp;
      monster.radius = meta?.radius ?? 10;
      monster.speed = meta?.speed ?? 2;

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
    const available = getMonstersForWave(waveNumber);
    if (available.length === 0) return 'Normal';

    // Sort by unlock wave descending, pick from top 3 candidates
    const sorted = available.sort((a, b) => b.unlockWave - a.unlockWave);
    const candidates = sorted.slice(0, Math.min(3, sorted.length));
    return candidates[Math.floor(Math.random() * candidates.length)].monsterId;
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
   * Apply combat tick results (bullet hits, fired events)
   */
  private applyCombatResult(result: CombatTickResult): void {
    // Send bullet fired events to visible clients
    for (const event of result.bulletsFired) {
      sendToVisible(this, this.visionSystem, ServerMessage.BULLET_FIRED, event, event.x, event.y);
    }

    // Process bullet hits
    for (const hit of result.bulletsHit) {
      if (hit.targetType === 'monster') {
        const monster = this.state.monsters.get(hit.targetId);
        if (monster) {
          this.damageMonster(monster, hit.damage, hit.towerId);
          this.applyStatusEffects(monster, hit);

          // Process explosion targets
          for (const expTarget of hit.explosionTargets) {
            const expMonster = this.state.monsters.get(expTarget.id);
            if (expMonster) {
              this.damageMonster(expMonster, expTarget.damage, hit.towerId);
              this.applyStatusEffects(expMonster, hit);
            }
          }
        }
      } else if (hit.targetType === 'building') {
        const building = this.state.buildings.get(hit.targetId);
        if (building) {
          this.damageBuilding(building, hit.damage, hit.towerId);
        }
      }
    }

    // Broadcast bullet removed events (IDs only, no position data to filter)
    if (result.bulletsRemoved.length > 0) {
      this.broadcast(ServerMessage.BULLET_HIT, {
        removedBullets: result.bulletsRemoved,
      });
    }
  }

  /**
   * Apply melee collision results
   */
  private applyMeleeResults(results: MeleeResult[]): void {
    for (const result of results) {
      if (result.mineId) {
        // Mine hit
        const destroyed = this.mineManager.damageMine(
          result.mineId,
          result.damage,
          result.monsterId
        );
        if (destroyed) {
          const mine = this.state.mines.get(result.mineId);
          const mx = mine?.position.x ?? 0;
          const my = mine?.position.y ?? 0;
          sendToVisible(this, this.visionSystem, ServerMessage.MINE_DESTROYED, {
            mineId: result.mineId,
            destroyedBy: result.monsterId,
          }, mx, my);
        }
      } else {
        // Building hit
        const building = this.state.buildings.get(result.buildingId);
        if (building) {
          this.damageBuilding(building, result.damage, result.monsterId);
        }
      }
      this.removeMonster(result.monsterId);
    }
  }

  /**
   * Sync energy state from EnergyCalculator to PlayerState for client display
   */
  private syncEnergyToPlayerStates(): void {
    for (const [playerId, energy] of this.energyCalc.getPlayerStates()) {
      const player = this.state.getPlayer(playerId);
      if (!player) continue;
      player.energyProduction = energy.production;
      player.energyConsumption = energy.consumption;
      player.energySatisfaction = energy.satisfactionRatio;
    }
  }


  /**
   * Periodically broadcast authoritative territory state to clients
   * Runs every TERRITORY_SYNC_INTERVAL ticks (default: 2 seconds)
   */
  private syncTerritoryToClients(): void {
    this.territorySyncCounter++;
    if (this.territorySyncCounter < this.TERRITORY_SYNC_INTERVAL) return;
    this.territorySyncCounter = 0;

    const payload: TerritorySyncPayload = { territories: {} };

    // Build payload from current territory calculator results
    for (const [playerId, _player] of this.state.players) {
      const result = this.territoryCalc.getPlayerResult(playerId);
      if (!result) continue;

      payload.territories[playerId] = {
        validBuildings: Array.from(result.validBuildings),
        invalidBuildings: Array.from(result.invalidBuildings),
      };
    }

    // Broadcast to all clients
    this.broadcast(ServerMessage.TERRITORY_SYNC, payload);
  }

  /**
   * Recalculate vision for all players and touch entities whose visibility changed.
   * Uses OPERATION.TOUCH to trigger @filterChildren without sending data bytes.
   */
  private updateVision(): void {
    const changedIds = this.visionSystem.recalculate(
      this.state.currentTick,
      this.state.towers,
      this.state.monsters,
      this.state.buildings,
      this.state.mines,
    );

    if (changedIds.size === 0) return;

    // Touch entities whose visibility changed to force @filterChildren re-evaluation
    // Using self-assign on a field to trigger the dirty flag
    for (const id of changedIds) {
      const tower = this.state.towers.get(id);
      if (tower) { tower.hp = tower.hp; continue; }

      const building = this.state.buildings.get(id);
      if (building) { building.hp = building.hp; continue; }

      const mine = this.state.mines.get(id);
      if (mine) { mine.hp = mine.hp; continue; }

      // Monsters move every tick, their filter triggers naturally
    }
  }

  /**
   * Handle vision upgrade request
   */
  private handleUpgradeVision(client: Client, payload: UpgradeVisionPayload): void {
    const playerId = client.sessionId;
    const { towerId, visionType } = payload;

    // Whitelist validation for visionType
    const validTypes: string[] = ['observer', 'radar'];
    if (!validTypes.includes(visionType)) {
      console.warn(`[GameRoom] Invalid visionType: ${visionType}`);
      return;
    }

    // Validate tower exists and belongs to player
    const tower = this.state.towers.get(towerId);
    if (!tower || tower.ownerId !== playerId) {
      this.sendActionRejected(client, 'UPGRADE_VISION', 'Tower not found or not owned');
      return;
    }

    // Validate upgrade is possible
    if (!canUpgradeVision(tower.visionType, tower.visionLevel, visionType)) {
      this.sendActionRejected(client, 'UPGRADE_VISION', 'Cannot upgrade vision');
      return;
    }

    // Calculate price and check money
    const price = getVisionUpgradePrice(tower.visionType, tower.visionLevel, visionType);
    const player = this.state.getPlayer(playerId);
    if (!player || player.money < price) {
      this.sendActionRejected(client, 'UPGRADE_VISION', 'Not enough money');
      return;
    }

    // Apply upgrade
    player.money -= price;
    if (tower.visionType === visionType) {
      tower.visionLevel++;
    } else {
      tower.visionType = visionType;
      tower.visionLevel = 1;
    }

    // Mark vision dirty for recalculation
    this.visionSystem.markDirty();

    console.log(
      `[GameRoom] Vision upgraded: ${towerId} -> ${visionType} lv${tower.visionLevel} by ${player.name} (cost: ${price})`
    );
  }

  // === Mine Message Handlers ===

  private handleUpgradeMine(client: Client, payload: UpgradeMinePayload): void {
    const playerId = client.sessionId;
    const result = this.mineManager.upgradeMine(payload.mineId, playerId);
    if (!result.ok) {
      this.sendActionRejected(client, 'upgrade_mine', result.error!);
    }
  }

  private handleRepairMine(client: Client, payload: RepairMinePayload): void {
    const playerId = client.sessionId;
    const result = this.mineManager.repairMine(payload.mineId, playerId);
    if (!result.ok) {
      this.sendActionRejected(client, 'repair_mine', result.error!);
    }
  }

  private handleDowngradeMine(client: Client, payload: DowngradeMinePayload): void {
    const playerId = client.sessionId;
    const result = this.mineManager.downgradeMine(payload.mineId, playerId);
    if (!result.ok) {
      this.sendActionRejected(client, 'downgrade_mine', result.error!);
    }
  }

  private handleSellMine(client: Client, payload: SellMinePayload): void {
    const playerId = client.sessionId;
    const result = this.mineManager.sellMine(payload.mineId, playerId);
    if (!result.ok) {
      this.sendActionRejected(client, 'sell_mine', result.error!);
    }
  }

  /**
   * Apply status effects from bullet hit to monster
   */
  private applyStatusEffects(monster: MonsterState, hit: BulletHitResult): void {
    // Freeze effect
    if (hit.freezeMultiplier < 1) {
      monster.isSlowed = true;
      monster.slowEndTime = this.state.currentTick + 180; // ~3 seconds at 60fps
      // Apply speed reduction
      monster.velocity.x *= hit.freezeMultiplier;
      monster.velocity.y *= hit.freezeMultiplier;
    }

    // Burn effect
    if (hit.burnRate > 0) {
      // Stack burn rate with cap (matches client maxBurnRate)
      monster.burnRate = Math.min(monster.burnRate + hit.burnRate, 0.005);
      // Track who applied the burn for kill attribution
      monster.burnSourceOwnerId = hit.ownerId;
      // Fire clears ice
      if (monster.isSlowed) {
        monster.isSlowed = false;
      }
    }
  }

  /**
   * Damage a monster
   */
  private damageMonster(monster: MonsterState, damage: number, sourceId: string): void {
    monster.hp -= damage;

    sendToVisible(this, this.visionSystem, ServerMessage.MONSTER_DAMAGED, {
      monsterId: monster.id,
      damage,
      sourceId,
    }, monster.position.x, monster.position.y);

    if (monster.hp <= 0) {
      this.killMonster(monster, sourceId);
    }
  }

  /**
   * Kill a monster
   */
  private killMonster(monster: MonsterState, killerId: string, killerOwnerId?: string): void {
    // Award money to killer - killerId can be a tower ID or bullet owner ID
    // killerOwnerId can be passed directly (e.g. burn kills) to skip tower lookup
    if (!killerOwnerId) {
      const killerTower = this.state.towers.get(killerId);
      killerOwnerId = killerTower?.ownerId || '';
    }

    if (killerOwnerId) {
      const player = this.state.getPlayer(killerOwnerId);
      if (player) {
        const reward = this.getMonsterReward(monster.monsterType);
        player.money += reward;
        player.monstersKilled++;

        sendToEntityOwnerAndVisible(this, this.visionSystem, ServerMessage.MONSTER_KILLED, {
          monsterId: monster.id,
          killerId,
          reward,
        }, killerOwnerId, monster.position.x, monster.position.y);
      }
    }

    this.removeMonster(monster.id);
  }

  /**
   * Get monster kill reward
   */
  private getMonsterReward(monsterType: string): number {
    const meta = SPAWNABLE_MONSTER_META[monsterType];
    return meta?.reward ?? 10;
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

    sendToEntityOwnerAndVisible(this, this.visionSystem, ServerMessage.BUILDING_DAMAGED, {
      buildingId: building.id,
      damage,
      sourceId,
    }, building.ownerId, building.position.x, building.position.y);

    if (building.hp <= 0) {
      this.destroyBuilding(building, sourceId);
    }
  }

  /**
   * Destroy a building
   */
  private destroyBuilding(building: BuildingState, sourceId: string): void {
    // Building owner always receives destruction event
    sendToEntityOwnerAndVisible(this, this.visionSystem, ServerMessage.BUILDING_DESTROYED, {
      buildingId: building.id,
      sourceId,
      wasBase: building.isBase,
    }, building.ownerId, building.position.x, building.position.y);

    // If this was a base, eliminate the player
    if (building.isBase && building.ownerId) {
      this.handlePlayerElimination(building.ownerId, 'base_destroyed');
    }

    this.state.buildings.delete(building.id);

    // Mark territory, energy, and vision dirty
    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();
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
    const stats = Array.from(this.state.players.values()).map((p: PlayerState) => ({
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

    // Generate mines from base positions
    const basePositions = this.state.getAlivePlayers().map((p: PlayerState) => ({
      x: p.basePosition.x,
      y: p.basePosition.y,
    }));
    this.mineManager.generateMines(basePositions);

    this.broadcast(ServerMessage.GAME_STARTED, {});

    this.startGameLoop();

    console.log(`[GameRoom] Game started with ${this.state.getPlayerCount()} players`);
  }

  /**
   * Handle build tower
   */
  private handleBuildTower(client: Client, payload: BuildTowerPayload): void {
    // Ensure territory is up-to-date
    this.territoryCalc.recalculate(this.state.buildings, this.state.towers, this.state.mines);

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

    // Apply real combat stats from metadata
    const meta = getTowerCombatData(payload.towerType);
    if (meta) {
      tower._baseMaxHp = meta.hp;
      tower._baseAttackRadius = meta.attackRadius;
      tower.hp = meta.hp;
      tower.maxHp = meta.hp;
      tower.radius = meta.radius;
      tower.attackRadius = meta.attackRadius;
      tower.attackClock = meta.attackClock;
      tower.attackBulletCount = meta.bulletCount;
    } else {
      // Fallback for non-bullet towers (Laser/Hammer/Boomerang/Hell/Ray/ManualCannon)
      const baseMeta = getTowerBaseMeta(payload.towerType);
      if (baseMeta) {
        tower._baseMaxHp = baseMeta.hp;
        tower._baseAttackRadius = baseMeta.attackRadius;
        tower.hp = baseMeta.hp;
        tower.maxHp = baseMeta.hp;
        tower.radius = baseMeta.radius;
        tower.attackRadius = baseMeta.attackRadius;
        if (baseMeta.isManual) {
          tower.isManual = true;
          tower.maxAmmo = baseMeta.maxAmmo!;
          tower.currentAmmo = baseMeta.maxAmmo!; // start fully loaded
        }
      } else {
        console.warn(`[GameRoom] No combat/base meta found for tower type: ${payload.towerType}`);
      }
    }

    this.state.towers.set(tower.id, tower);
    player.towersBuilt++;

    // Mark territory, energy, and vision dirty for recalculation
    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();

    // Apply territory penalties
    this.applyTerritoryPenalties();

    console.log(
      `[GameRoom] Tower built: ${payload.towerType} at (${payload.x}, ${payload.y}) by ${player.name} (cost: ${cost})`
    );
  }

  private handleBuildBuilding(client: Client, payload: BuildBuildingPayload): void {
    this.territoryCalc.recalculate(this.state.buildings, this.state.towers, this.state.mines);

    const result = this.inputValidator.validateBuildBuilding(
      client.sessionId,
      payload.buildingType,
      payload.x,
      payload.y
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'BUILD_BUILDING', result.errorMessage || 'Validation failed', result.errorCode);
      return;
    }

    const player = this.state.getPlayer(client.sessionId)!;
    const cost = result.data?.cost as number;

    player.money -= cost;

    const building = new BuildingState();
    building.id = this.state.generateEntityId('building');
    building.ownerId = client.sessionId;
    building.buildingType = payload.buildingType;
    building.setPosition(payload.x, payload.y);

    const meta = getBuildingMeta(payload.buildingType);
    if (meta) {
      building.hp = meta.hp;
      building.maxHp = meta.hp;
      building.radius = meta.radius;
    }

    this.state.buildings.set(building.id, building);

    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();

    this.applyTerritoryPenalties();

    console.log(
      `[GameRoom] Building built: ${payload.buildingType} at (${payload.x}, ${payload.y}) by ${player.name} (cost: ${cost})`
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

    // Preserve vision properties across tower type change
    const savedVisionType = tower.visionType;
    const savedVisionLevel = tower.visionLevel;
    const wasInValidTerritory = tower.inValidTerritory;

    // Upgrade tower: change type and increment level
    tower.towerType = payload.targetType;
    tower.level++;

    // Update tower stats based on new type
    const targetCombatMeta = getTowerCombatData(payload.targetType);
    if (targetCombatMeta) {
      tower._baseMaxHp = targetCombatMeta.hp;
      tower._baseAttackRadius = targetCombatMeta.attackRadius;
      tower.hp = targetCombatMeta.hp;
      tower.maxHp = targetCombatMeta.hp;
      tower.radius = targetCombatMeta.radius;
      tower.attackRadius = targetCombatMeta.attackRadius;
      tower.attackClock = targetCombatMeta.attackClock;
      tower.attackBulletCount = targetCombatMeta.bulletCount;
    } else {
      // Fallback for non-bullet towers (Laser/Hammer/Boomerang/Hell/Ray/ManualCannon)
      const baseMeta = getTowerBaseMeta(payload.targetType);
      if (baseMeta) {
        tower._baseMaxHp = baseMeta.hp;
        tower._baseAttackRadius = baseMeta.attackRadius;
        tower.hp = baseMeta.hp;
        tower.maxHp = baseMeta.hp;
        tower.radius = baseMeta.radius;
        tower.attackRadius = baseMeta.attackRadius;
        if (baseMeta.isManual) {
          tower.isManual = true;
          tower.maxAmmo = baseMeta.maxAmmo!;
          tower.currentAmmo = baseMeta.maxAmmo!;
        }
      }
    }

    // Reapply territory penalty if needed
    if (!wasInValidTerritory) {
      this.applyTowerPenalty(tower);
    }

    // Notify combat system of upgrade
    this.combatSystem.onTowerUpgraded(tower.id, payload.targetType);

    // Restore vision properties after type change
    tower.visionType = savedVisionType;
    tower.visionLevel = savedVisionLevel;

    // Mark energy dirty (level change affects consumption)
    this.energyCalc.markDirty();

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

    // Notify combat system before removal
    this.combatSystem.onTowerRemoved(payload.towerId);

    // Remove tower
    this.state.towers.delete(payload.towerId);

    // Mark territory, energy, and vision dirty
    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();

    console.log(`[GameRoom] Tower sold: ${payload.towerId} by ${player.name} (refund: ${refund})`);
  }

  /**
   * Handle spawn monster
   */
  private handleSpawnMonster(client: Client, payload: SpawnMonsterPayload): void {
    // Ensure territory is up-to-date
    this.territoryCalc.recalculate(this.state.buildings, this.state.towers, this.state.mines);

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

    // Use real stats from metadata
    const meta = SPAWNABLE_MONSTER_META[payload.monsterType];
    monster.hp = meta?.baseHp ?? 100;
    monster.maxHp = monster.hp;
    monster.radius = meta?.radius ?? 10;
    monster.speed = meta?.speed ?? 2;

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

    // Create projectile via combat system
    const bulletEvent = this.combatSystem.fireManualCannon(tower, payload.targetX, payload.targetY);
    if (bulletEvent) {
      sendToVisible(this, this.visionSystem, ServerMessage.BULLET_FIRED, bulletEvent, bulletEvent.x, bulletEvent.y);
    }

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

    // Clear auto-target if requested
    if (payload.clear) {
      tower.hasAutoTarget = false;
      tower.autoTargetX = 0;
      tower.autoTargetY = 0;
      tower.autoTargetRadius = 0;
      return;
    }

    // Store auto-target settings
    tower.autoTargetX = payload.targetX;
    tower.autoTargetY = payload.targetY;
    tower.autoTargetRadius = payload.radius;
    tower.hasAutoTarget = true;

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
