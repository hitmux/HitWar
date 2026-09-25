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
  MineState,
  VectorSchema,
  GamePhase,
  GameEndReason,
  PLAYER_COLORS,
} from '../schema/index.js';
import type { MonsterRuntimeState } from '../schema/MonsterState.js';
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
  RateLimiter,
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
import { scaleSpeed } from '../../../shared/constants/speedScale.js';
import { normalize, sub } from '../shared/math/vector.js';
import { getRequiredMonsterRuntimeConfig } from '../systems/monster/runtimeConfig.js';
import { calcDodgeOffset, calcMovementTypeOffset, selectTargetPosition } from '../systems/monster/monsterAi.js';
import {
  computeBombSelfHits,
  computeBulletChangeEffects,
  computeGainEffects,
  computeGravityAreaEffects,
  computeLaserDefenseStep,
  computeSummonSpawnPlans,
  getMonsterAbilitySet,
  recoverLaserDefenseCharges,
} from '../systems/monster/monsterAbilities.js';
import {
  computeTerminatorAppliedDamage,
  createMortisDashPlan,
  createShooterShotPlan,
  hasMortisReachedDashEndpoint,
  isTerminatorMonster,
  resolveMortisRuntimeConfig,
  selectMortisDashTarget,
  selectShooterTarget,
} from '../systems/monster/specialBehaviors.js';

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

type TargetableStructureState = BuildingState | TowerState;

interface MonsterStructureTarget {
  id: string;
  ownerId: string;
  position: VectorSchema;
  hp: number;
  maxHp: number;
  radius: number;
  damage?: number;
  clock?: number;
  isBase?: boolean;
  kind: 'building' | 'tower';
  source: TargetableStructureState;
}

export class GameRoom extends Room {
  // State type declaration
  declare state: GameState;
  // Game loop
  private gameLoopInterval: Delayed | null = null;
  private countdownInterval: Delayed | null = null;
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
  private rateLimiter = new RateLimiter(SERVER_CONFIG.tickRate);
  private towerMeta!: TowerMetaRegistry;
  private spawnableMeta!: SpawnableMonsterRegistry;
  private buildingMeta!: BuildingMetaRegistry;
  private mineManager!: MineManager;
  private visionSystem!: VisionSystem;

  private neutralMonsterCount: number = 0;
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
    // Helper: wrap handler with per-client rate limiting
    const rateLimited = <T>(
      msgType: string,
      handler: (client: Client, payload: T) => void,
      allowedPhases: readonly string[] = [GamePhase.PLAYING]
    ) => {
      this.onMessage(msgType, (client: Client, payload: T) => {
        if (!this.rateLimiter.consume(client.sessionId, msgType)) {
          const reason = this.rateLimiter.isConfigured(msgType)
            ? 'Rate limit exceeded'
            : 'Message type is not allowed';
          this.sendActionRejected(client, msgType, reason, 'RATE_LIMITED');
          return;
        }
        if (!allowedPhases.includes(this.state.phase)) {
          this.sendActionRejected(client, msgType, `Action unavailable during ${this.state.phase}`, 'INVALID_PHASE');
          return;
        }
        handler(client, payload);
      });
    };

    // Player ready
    rateLimited(ClientMessage.PLAYER_READY, (client) => {
      this.handlePlayerReady(client);
    }, [GamePhase.WAITING]);

    rateLimited(ClientMessage.PLAYER_NOT_READY, (client) => {
      this.handlePlayerNotReady(client);
    }, [GamePhase.WAITING, GamePhase.STARTING]);

    // Building actions
    rateLimited<BuildTowerPayload>(ClientMessage.BUILD_TOWER, (client, payload) => {
      this.handleBuildTower(client, payload);
    });

    rateLimited<BuildBuildingPayload>(ClientMessage.BUILD_BUILDING, (client, payload) => {
      this.handleBuildBuilding(client, payload);
    });

    rateLimited<UpgradeTowerPayload>(ClientMessage.UPGRADE_TOWER, (client, payload) => {
      this.handleUpgradeTower(client, payload);
    });

    rateLimited<SellTowerPayload>(ClientMessage.SELL_TOWER, (client, payload) => {
      this.handleSellTower(client, payload);
    });

    // Spawner actions
    rateLimited<SpawnMonsterPayload>(ClientMessage.SPAWN_MONSTER, (client, payload) => {
      this.handleSpawnMonster(client, payload);
    });

    // Manual cannon actions
    rateLimited<CannonFirePayload>(ClientMessage.CANNON_FIRE, (client, payload) => {
      this.handleCannonFire(client, payload);
    });

    rateLimited<CannonSetAutoTargetPayload>(
      ClientMessage.CANNON_SET_AUTO_TARGET,
      (client, payload) => {
        this.handleCannonSetAutoTarget(client, payload);
      }
    );

    // Game control
    rateLimited(ClientMessage.SURRENDER, (client) => {
      this.handleSurrender(client);
    });

    // Mine actions
    rateLimited<UpgradeMinePayload>(ClientMessage.UPGRADE_MINE, (client, payload) => {
      this.handleUpgradeMine(client, payload);
    });

    rateLimited<RepairMinePayload>(ClientMessage.REPAIR_MINE, (client, payload) => {
      this.handleRepairMine(client, payload);
    });

    rateLimited<DowngradeMinePayload>(ClientMessage.DOWNGRADE_MINE, (client, payload) => {
      this.handleDowngradeMine(client, payload);
    });

    rateLimited<SellMinePayload>(ClientMessage.SELL_MINE, (client, payload) => {
      this.handleSellMine(client, payload);
    });

    // Vision actions
    rateLimited<UpgradeVisionPayload>(ClientMessage.UPGRADE_VISION, (client, payload) => {
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
    if (this.state.phase === GamePhase.WAITING || this.state.phase === GamePhase.STARTING) {
      if (this.state.phase === GamePhase.STARTING) {
        this.cancelCountdown();
      }
      this.removePlayer(client.sessionId);
      this.rateLimiter.removeClient(client.sessionId);
      return;
    }

    // If game has ended, just clean up
    if (this.state.phase === GamePhase.ENDED) {
      this.rateLimiter.removeClient(client.sessionId);
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

        // Allow reconnection - handle timeout in catch block
        try {
          await this.allowReconnection(client, SERVER_CONFIG.reconnectTimeout / 1000);
        } catch {
          // Reconnection timeout - eliminate player
          if (this.disconnectedClients.has(client.sessionId)) {
            console.log(`[GameRoom] Reconnect timeout for: ${player.name}`);
            this.handlePlayerElimination(client.sessionId, 'disconnect_timeout');
            this.disconnectedClients.delete(client.sessionId);
            this.resumeGame();
          }
        }
      }
    }
  }

  /**
   * Handle player reconnection
   */
  private handleReconnection(client: Client, playerState: PlayerState): void {
    console.log(`[GameRoom] Player reconnected: ${playerState.name}`);

    // Preserve old sessionId before updating to new one
    const oldSessionId = playerState.sessionId;

    playerState.isConnected = true;
    playerState.sessionId = client.sessionId;

    // Re-key player in state map and migrate subsystems if sessionId changed
    if (oldSessionId !== client.sessionId) {
      this.state.players.delete(oldSessionId);
      this.state.players.set(client.sessionId, playerState);
      this.state.towers.forEach((entity) => {
        if (entity.ownerId === oldSessionId) entity.ownerId = client.sessionId;
      });
      this.state.buildings.forEach((entity) => {
        if (entity.ownerId === oldSessionId) entity.ownerId = client.sessionId;
      });
      this.state.mines.forEach((entity) => {
        if (entity.ownerId === oldSessionId) entity.ownerId = client.sessionId;
      });
      this.state.monsters.forEach((entity) => {
        if (entity.ownerId === oldSessionId) entity.ownerId = client.sessionId;
      });
      this.rateLimiter.migrateClient(oldSessionId, client.sessionId);
      this.visionSystem.migratePlayer(oldSessionId, client.sessionId);
    }

    // Use old sessionId to clean up disconnectedClients map
    // (the map is keyed by the sessionId at disconnection time)
    this.disconnectedClients.delete(oldSessionId);
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

    // Clean up subsystem player data to prevent memory leaks
    this.visionSystem.removePlayer(playerId);
    this.energyCalc.removePlayer(playerId);
    this.rateLimiter.removeClient(playerId);
    this.disconnectedClients.delete(playerId);

    // Mark remaining systems dirty after entity removal
    this.territoryCalc.markDirty();

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
    this.cancelCountdown();
    this.stopGameLoop();
    this.updateRoomPlayingMetadata(false);
    this.rateLimiter.clear();
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

  private cancelCountdown(): void {
    if (this.countdownInterval) {
      this.countdownInterval.clear();
      this.countdownInterval = null;
    }

    if (this.state.phase === GamePhase.STARTING) {
      this.state.phase = GamePhase.WAITING;
    }

    this.state.countdownTicks = 0;
  }

  private updateRoomPlayingMetadata(isPlaying: boolean): void {
    void this.setMetadata({
      ...(this.metadata ?? {}),
      isPlaying,
    }).catch((error) => {
      console.error('[GameRoom] Failed to update room metadata:', error);
    });
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
    this.rateLimiter.setCurrentTick(this.state.currentTick);

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

    // Phase 3: Monster melee (buildings + towers + mines)
    const meleeResults = this.combatSystem.processMonsterMelee(
      this.state.monsters,
      this.state.buildings,
      this.state.mines,
      this.state.towers
    );
    this.applyMeleeResults(meleeResults);

    // Phase 4: Game end check
    this.checkGameEnd();
  }

  /**
   * Update all monsters
   */
  private updateMonsters(): void {
    const monstersSnapshot = Array.from(this.state.monsters.values());
    const buildingsSnapshot = Array.from(this.state.buildings.values());
    const towersSnapshot = Array.from(this.state.towers.values());
    const minesSnapshot = Array.from(this.state.mines.values());
    const structureTargets = this.buildStructureTargets(buildingsSnapshot, towersSnapshot);

    for (const monster of monstersSnapshot) {
      if (!this.state.monsters.has(monster.id)) {
        continue;
      }

      const runtime =
        monster.runtime ??
        this.initializeMonsterRuntime(monster, this.getTargetBasePosition(monster.targetPlayerId));

      runtime.liveTime += 1;
      runtime.currentCollisionDamage =
        runtime.config.baseClass === 'MonsterMortis'
          ? runtime.config.abilities.mortis.bumpDamage
          : runtime.config.stats.colishDamage;
      runtime.keepAliveOnCollision =
        runtime.config.throwAble || runtime.config.baseClass === 'MonsterTerminator';

      monster.prevX = monster.position.x;
      monster.prevY = monster.position.y;

      if (monster.isFrozen && this.state.currentTick >= monster.freezeEndTime) {
        monster.isFrozen = false;
      }
      if (monster.isSlowed && this.state.currentTick >= monster.slowEndTime) {
        monster.isSlowed = false;
        runtime.slowMultiplier = 1;
      }

      this.updateMonsterTarget(monster, structureTargets);
      this.processMonsterAbilities(
        monster,
        monstersSnapshot,
        buildingsSnapshot,
        towersSnapshot,
        minesSnapshot
      );

      if (!this.state.monsters.has(monster.id)) {
        continue;
      }

      if (this.applyMonsterBurn(monster)) {
        continue;
      }

      this.processMonsterAttack(monster, structureTargets);

      if (!this.state.monsters.has(monster.id)) {
        continue;
      }

      this.moveMonster(monster, structureTargets);
    }
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

  private getTargetBasePosition(targetPlayerId: string): { x: number; y: number } {
    const targetPlayer = this.state.getPlayer(targetPlayerId);
    if (targetPlayer) {
      return {
        x: targetPlayer.basePosition.x,
        y: targetPlayer.basePosition.y,
      };
    }

    return {
      x: this.state.mapConfig.width / 2,
      y: this.state.mapConfig.height / 2,
    };
  }

  private initializeMonsterRuntime(
    monster: MonsterState,
    targetBasePosition: { x: number; y: number }
  ): MonsterRuntimeState {
    const config = getRequiredMonsterRuntimeConfig(monster.monsterType);
    const runtime: MonsterRuntimeState = {
      config,
      liveTime: 0,
      currentRawSpeed: config.stats.rawSpeed,
      destinationX: targetBasePosition.x,
      destinationY: targetBasePosition.y,
      currentCollisionDamage: config.stats.colishDamage,
      keepAliveOnCollision: config.throwAble || config.baseClass === 'MonsterTerminator',
      laserCharges: config.abilities.laserDefense.initialCharge,
      teleportCharges: config.teleportingCount,
      currentTargetBuildingId: '',
      currentDashTargetId: '',
      dashEndpointX: null,
      dashEndpointY: null,
      slowMultiplier: 1,
      holdPositionTicks: 0,
    };

    monster.runtime = runtime;
    monster.movementType = config.movementType;
    monster.dodgeAble = config.abilities.dodge.enabled;
    monster.speed = config.stats.speed;
    monster.radius = config.stats.radius;
    monster.lastDamageOwnerId = '';

    return runtime;
  }

  private setMonsterDestination(monster: MonsterState, x: number, y: number): void {
    if (!monster.runtime) {
      return;
    }
    monster.runtime.destinationX = x;
    monster.runtime.destinationY = y;
  }

  private applyMonsterVelocityTowardDestination(monster: MonsterState): void {
    const runtime = monster.runtime;
    if (!runtime) {
      return;
    }

    const destination = { x: runtime.destinationX, y: runtime.destinationY };
    const direction = normalize(sub(destination, monster.position));
    const movementOffset = calcMovementTypeOffset({
      position: monster.position,
      destination,
      liveTime: runtime.liveTime,
      movementType: runtime.config.movementType,
    });
    const dodgeOffset = calcDodgeOffset(
      {
        ownerId: monster.ownerId,
        position: monster.position,
        velocity: monster.velocity,
        liveTime: runtime.liveTime,
      },
      this.combatSystem.getActiveBullets().map((bullet) => ({
        position: bullet.position,
        velocity: bullet.velocity,
        radius: bullet.radius,
      })),
      {
        detectRadius: runtime.config.abilities.dodge.detectRadius,
        dodgeStrength: runtime.config.abilities.dodge.dodgeStrength,
        reactionTime: runtime.config.abilities.dodge.reactionTicks,
      }
    );

    if (runtime.config.stats.acceleration > 0 && runtime.currentRawSpeed < runtime.config.stats.rawMaxSpeed) {
      runtime.currentRawSpeed = Math.min(
        runtime.currentRawSpeed + runtime.config.stats.rawAcceleration,
        runtime.config.stats.rawMaxSpeed
      );
    }

    const effectiveSpeed =
      scaleSpeed(runtime.currentRawSpeed) *
      (monster.isSlowed ? runtime.slowMultiplier : 1);

    monster.speed = effectiveSpeed;
    monster.setVelocity(
      direction.x * effectiveSpeed + movementOffset.x + dodgeOffset.x,
      direction.y * effectiveSpeed + movementOffset.y + dodgeOffset.y
    );
  }

  private createMonsterState(
    monsterType: string,
    ownerId: string,
    targetPlayerId: string,
    position: { x: number; y: number },
    hpOverride?: number
  ): MonsterState {
    const config = getRequiredMonsterRuntimeConfig(monsterType);
    const monster = new MonsterState();
    monster.id = this.state.generateEntityId('monster');
    monster.ownerId = ownerId;
    monster.targetPlayerId = targetPlayerId;
    monster.monsterType = monsterType;
    monster.setPosition(position.x, position.y);
    monster.hp = hpOverride ?? config.stats.baseHp;
    monster.maxHp = monster.hp;
    monster.radius = config.stats.radius;
    monster.speed = config.stats.speed;
    const runtime = this.initializeMonsterRuntime(monster, this.getTargetBasePosition(targetPlayerId));
    runtime.currentCollisionDamage =
      config.baseClass === 'MonsterMortis'
        ? config.abilities.mortis.bumpDamage
        : config.stats.colishDamage;
    this.applyMonsterVelocityTowardDestination(monster);
    return monster;
  }

  private registerMonsterState(monster: MonsterState, countTowardWave: boolean = false): void {
    this.state.monsters.set(monster.id, monster);
    if (monster.ownerId === '') {
      this.neutralMonsterCount++;
    }
    if (countTowardWave && this.state.wave.isWaveActive) {
      this.state.wave.monstersRemaining++;
    }
  }

  private clampMonsterPosition(monster: MonsterState): void {
    monster.position.x = Math.max(0, Math.min(this.state.mapConfig.width, monster.position.x));
    monster.position.y = Math.max(0, Math.min(this.state.mapConfig.height, monster.position.y));
  }

  private clampStructurePosition(structure: TargetableStructureState): void {
    structure.position.x = Math.max(0, Math.min(this.state.mapConfig.width, structure.position.x));
    structure.position.y = Math.max(0, Math.min(this.state.mapConfig.height, structure.position.y));
  }

  private buildStructureTargets(
    buildingsSnapshot: BuildingState[],
    towersSnapshot: TowerState[]
  ): MonsterStructureTarget[] {
    const buildingTargets: MonsterStructureTarget[] = buildingsSnapshot.map((building) => ({
      id: building.id,
      ownerId: building.ownerId,
      position: building.position,
      hp: building.hp,
      maxHp: building.maxHp,
      radius: building.radius,
      isBase: building.isBase,
      kind: 'building',
      source: building,
    }));

    const towerTargets: MonsterStructureTarget[] = towersSnapshot.map((tower) => {
      const combatMeta = getTowerCombatData(tower.towerType);
      return {
        id: tower.id,
        ownerId: tower.ownerId,
        position: tower.position,
        hp: tower.hp,
        maxHp: tower.maxHp,
        radius: tower.radius,
        damage:
          combatMeta
            ? combatMeta.bulletDamage * Math.max(1, tower.attackBulletCount)
            : undefined,
        clock: tower.attackClock > 0 ? tower.attackClock : undefined,
        kind: 'tower',
        source: tower,
      };
    });

    return buildingTargets.concat(towerTargets);
  }

  private syncBasePosition(building: BuildingState): void {
    if (!building.isBase || !building.ownerId) {
      return;
    }

    const player = this.state.getPlayer(building.ownerId);
    if (player) {
      player.basePosition.x = building.position.x;
      player.basePosition.y = building.position.y;
    }
  }

  private updateMonsterTarget(
    monster: MonsterState,
    structureTargets: MonsterStructureTarget[]
  ): void {
    const runtime = monster.runtime;
    if (!runtime || !runtime.config.abilities.targetSelection.enabled) {
      return;
    }

    const newTarget = selectTargetPosition(
      {
        ownerId: monster.ownerId,
        position: monster.position,
        velocity: monster.velocity,
        liveTime: runtime.liveTime,
      },
      structureTargets.map((target) => ({
        ownerId: target.ownerId,
        position: target.position,
        hp: target.hp,
        maxHp: target.maxHp,
        damage: target.damage,
        clock: target.clock,
      })),
      {
        strategy: runtime.config.abilities.targetSelection.strategy,
        scanRadius: runtime.config.abilities.targetSelection.scanRadius,
        updateInterval: runtime.config.abilities.targetSelection.updateIntervalTicks,
        weights: runtime.config.abilities.targetSelection.weights,
      }
    );

    if (newTarget) {
      this.setMonsterDestination(monster, newTarget.x, newTarget.y);
    }
  }

  private processMonsterAbilities(
    monster: MonsterState,
    monstersSnapshot: MonsterState[],
    buildingsSnapshot: BuildingState[],
    towersSnapshot: TowerState[],
    minesSnapshot: MineState[]
  ): void {
    const runtime = monster.runtime;
    if (!runtime) {
      return;
    }

    const abilitySet = getMonsterAbilitySet(monster.monsterType);
    if (!abilitySet) {
      return;
    }

    if (
      runtime.config.abilities.laserDefense.enabled &&
      runtime.liveTime % runtime.config.abilities.laserDefense.consumeIntervalTicks === 0
    ) {
      const laserStep = computeLaserDefenseStep(
        {
          id: monster.id,
          position: monster.position,
          radius: monster.radius,
        },
        abilitySet.laserDefense,
        this.combatSystem.getActiveBullets(),
        runtime.laserCharges
      );
      runtime.laserCharges = laserStep.remainingCharges;
      for (const bulletId of laserStep.destroyedBulletIds) {
        this.combatSystem.removeBullet(bulletId);
      }
    }

    if (
      runtime.config.abilities.laserDefense.enabled &&
      runtime.liveTime % runtime.config.abilities.laserDefense.recoverIntervalTicks === 0
    ) {
      runtime.laserCharges = recoverLaserDefenseCharges(runtime.laserCharges, abilitySet.laserDefense);
    }

    if (
      runtime.config.abilities.gain.enabled &&
      runtime.liveTime % runtime.config.abilities.gain.intervalTicks === 0
    ) {
      const gainEffects = computeGainEffects(
        {
          id: monster.id,
          ownerId: monster.ownerId,
          position: monster.position,
          radius: monster.radius,
        },
        abilitySet.gain,
        monstersSnapshot,
        { maxEligibleSpeed: 7.5 }
      );

      for (const effect of gainEffects) {
        effect.monster.hp = Math.min(effect.monster.maxHp + effect.maxHpDelta, effect.monster.hp + effect.hpDelta);
        effect.monster.maxHp += effect.maxHpDelta;
        effect.monster.radius += effect.radiusDelta;
        if (effect.monster.runtime) {
          effect.monster.runtime.currentRawSpeed += effect.speedDelta;
          effect.monster.runtime.currentCollisionDamage += effect.collisionDamageDelta;
        }
      }
    }

    if (runtime.config.abilities.gravityArea.enabled) {
      const gravityStructures = [
        ...buildingsSnapshot,
        ...towersSnapshot,
      ] as TargetableStructureState[];
      const gravityResult = computeGravityAreaEffects(
        {
          id: monster.id,
          ownerId: monster.ownerId,
          position: monster.position,
          radius: monster.radius,
        },
        abilitySet.gravityArea,
        gravityStructures,
        minesSnapshot
      );

      let movedStructure = false;
      for (const displacement of gravityResult.buildingDisplacements) {
        displacement.structure.position.x += displacement.displacement.x;
        displacement.structure.position.y += displacement.displacement.y;
        this.clampStructurePosition(displacement.structure as TargetableStructureState);
        if ('isBase' in displacement.structure) {
          this.syncBasePosition(displacement.structure as BuildingState);
        }
        movedStructure = true;
      }
      for (const mineDamage of gravityResult.mineDamages) {
        this.mineManager.damageMine(mineDamage.mineId, mineDamage.damage, monster.id);
      }
      if (movedStructure) {
        this.territoryCalc.markDirty();
        this.energyCalc.markDirty();
        this.visionSystem.markDirty();
      }
    }

    if (
      runtime.config.abilities.bulletChange.enabled &&
      runtime.liveTime % runtime.config.abilities.bulletChange.intervalTicks === 0
    ) {
      const bulletEffects = computeBulletChangeEffects(
        {
          id: monster.id,
          ownerId: monster.ownerId,
          position: monster.position,
          radius: monster.radius,
        },
        abilitySet.bulletChange,
        this.combatSystem.getActiveBullets()
      );
      for (const effect of bulletEffects) {
        effect.bullet.radius = Math.max(0.2, effect.bullet.radius + effect.radiusDelta);
        effect.bullet.damage += effect.damageDelta;
        effect.bullet.velocity.x += effect.acceleration.x;
        effect.bullet.velocity.y += effect.acceleration.y;
      }
    }

    if (
      runtime.config.abilities.summon.enabled &&
      runtime.config.abilities.summon.summonWhileAlive &&
      runtime.liveTime % runtime.config.abilities.summon.intervalTicks === 0
    ) {
      this.spawnMonsterSummons(monster, false);
    }
  }

  private applyMonsterBurn(monster: MonsterState): boolean {
    if (monster.burnRate <= 0) {
      return false;
    }

    const burnDamage = monster.maxHp * monster.burnRate;
    this.damageMonster(monster, burnDamage, '', monster.burnSourceOwnerId);
    return !this.state.monsters.has(monster.id);
  }

  private processMonsterAttack(
    monster: MonsterState,
    structureTargets: MonsterStructureTarget[]
  ): void {
    const runtime = monster.runtime;
    if (!runtime) {
      return;
    }

    if (runtime.config.baseClass !== 'MonsterShooter') {
      return;
    }

    const target = selectShooterTarget(
      monster,
      structureTargets as never[],
      runtime.currentTargetBuildingId || undefined
    ) as MonsterStructureTarget | null;
    runtime.currentTargetBuildingId = target?.id ?? '';

    if (
      !target ||
      runtime.liveTime % runtime.config.abilities.shooter.attackIntervalTicks !== 0
    ) {
      return;
    }

    const shotPlan = createShooterShotPlan(monster, target);
    if (!shotPlan) {
      return;
    }

    const event = this.combatSystem.spawnExternalBullet(
      {
        bulletType: shotPlan.bulletType,
        x: shotPlan.x,
        y: shotPlan.y,
        vx: shotPlan.vx,
        vy: shotPlan.vy,
        damage: shotPlan.damage,
        radius: shotPlan.radius,
        maxRange: shotPlan.maxRange,
        targetId: shotPlan.targetId,
        isExplosive: shotPlan.isExplosive,
        explosionRadius: shotPlan.explosionRadius,
        explosionDamage: shotPlan.explosionDamage,
        isPenetrating: shotPlan.isPenetrating,
        penetrationCount: shotPlan.penetrationCount,
        freezeMultiplier: shotPlan.freezeMultiplier,
        burnRate: shotPlan.burnRate,
        slideRate: shotPlan.slideRate,
        targetsTowers: shotPlan.targetsBuildings,
      },
      monster.id,
      monster.ownerId,
      'monster'
    );
    sendToVisible(this, this.visionSystem, ServerMessage.BULLET_FIRED, event, event.x, event.y);
  }

  private moveMonster(
    monster: MonsterState,
    structureTargets: MonsterStructureTarget[]
  ): void {
    const runtime = monster.runtime;
    if (!runtime) {
      return;
    }

    if (runtime.holdPositionTicks > 0) {
      runtime.holdPositionTicks -= 1;
      monster.setVelocity(0, 0);
      return;
    }

    if (runtime.config.baseClass === 'MonsterShooter' && runtime.currentTargetBuildingId) {
      monster.setVelocity(0, 0);
      return;
    }

    if (runtime.config.baseClass === 'MonsterMortis') {
      const mortisConfig = resolveMortisRuntimeConfig(monster);
      const target = selectMortisDashTarget(
        monster,
        structureTargets as never[],
        runtime.currentDashTargetId || undefined
      ) as MonsterStructureTarget | null;

      if (!mortisConfig || !target) {
        runtime.currentDashTargetId = '';
        runtime.dashEndpointX = null;
        runtime.dashEndpointY = null;
      } else {
        const needsNewDashEndpoint =
          runtime.currentDashTargetId !== target.id ||
          runtime.dashEndpointX === null ||
          runtime.dashEndpointY === null;

        if (needsNewDashEndpoint) {
          const dashPlan = createMortisDashPlan(monster, target);
          if (dashPlan) {
            runtime.currentDashTargetId = dashPlan.targetId;
            runtime.dashEndpointX = dashPlan.endPoint.x;
            runtime.dashEndpointY = dashPlan.endPoint.y;
            runtime.currentCollisionDamage = dashPlan.bumpDamage;
          }
        }

        if (runtime.dashEndpointX !== null && runtime.dashEndpointY !== null) {
          const dashEndPoint = {
            x: runtime.dashEndpointX,
            y: runtime.dashEndpointY,
          };

          if (hasMortisReachedDashEndpoint(monster, dashEndPoint)) {
            runtime.currentDashTargetId = '';
            runtime.dashEndpointX = null;
            runtime.dashEndpointY = null;
            monster.setVelocity(0, 0);
            return;
          }

          const dashDirection = normalize(sub(dashEndPoint, monster.position));
          if (dashDirection.x === 0 && dashDirection.y === 0) {
            runtime.currentDashTargetId = '';
            runtime.dashEndpointX = null;
            runtime.dashEndpointY = null;
            monster.setVelocity(0, 0);
            return;
          }

          monster.setVelocity(
            dashDirection.x * mortisConfig.bumpSpeed,
            dashDirection.y * mortisConfig.bumpSpeed
          );
          monster.position.x += monster.velocity.x;
          monster.position.y += monster.velocity.y;
          this.clampMonsterPosition(monster);
          return;
        }
      }
    }

    this.applyMonsterVelocityTowardDestination(monster);
    monster.position.x += monster.velocity.x;
    monster.position.y += monster.velocity.y;
    this.clampMonsterPosition(monster);
  }

  private spawnMonsterSummons(monster: MonsterState, onDeath: boolean): void {
    const runtime = monster.runtime;
    const abilitySet = getMonsterAbilitySet(monster.monsterType);
    if (!runtime || !abilitySet?.summon) {
      return;
    }

    if (onDeath && !runtime.config.abilities.summon.summonOnDeath) {
      return;
    }
    if (!onDeath && !runtime.config.abilities.summon.summonWhileAlive) {
      return;
    }

    const summonPlans = computeSummonSpawnPlans(
      {
        id: monster.id,
        position: monster.position,
        radius: monster.radius,
      },
      {
        ...abilitySet.summon,
        summonCount: runtime.config.abilities.summon.count,
        summonDistance: runtime.config.abilities.summon.distance,
      }
    );

    for (const plan of summonPlans) {
      const summoned = this.createMonsterState(
        plan.monsterType,
        monster.ownerId,
        monster.targetPlayerId,
        plan.position
      );
      this.registerMonsterState(summoned, monster.ownerId === '');
    }
  }

  private applyBombSelf(monster: MonsterState, sourceId: string): void {
    const abilitySet = getMonsterAbilitySet(monster.monsterType);
    if (!abilitySet?.bombSelf?.bombSelfAble) {
      return;
    }

    const hits = computeBombSelfHits(
      {
        id: monster.id,
        ownerId: monster.ownerId,
        position: monster.position,
        radius: monster.radius,
      },
      abilitySet.bombSelf,
      [
        ...this.state.buildings.values(),
        ...this.state.towers.values(),
      ] as TargetableStructureState[]
    );

    for (const hit of hits) {
      if (this.state.buildings.has(hit.buildingId)) {
        this.damageBuilding(hit.building as BuildingState, hit.damage, sourceId);
      } else if (this.state.towers.has(hit.buildingId)) {
        this.damageTower(hit.building as TowerState, hit.damage, sourceId);
      }
    }

    for (const mine of this.state.mines.values()) {
      if (mine.ownerId === monster.ownerId) {
        continue;
      }
      const dx = mine.position.x - monster.position.x;
      const dy = mine.position.y - monster.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > abilitySet.bombSelf.bombSelfRange + mine.radius) {
        continue;
      }
      const damage = Math.abs(
        (1 - distance / abilitySet.bombSelf.bombSelfRange) * abilitySet.bombSelf.bombSelfDamage
      );
      if (damage > 0) {
        this.mineManager.damageMine(mine.id, damage, sourceId);
      }
    }
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
      if (this.neutralMonsterCount === 0) {
        this.state.wave.isWaveActive = false;
        this.state.wave.monstersRemaining = 0;
        this.state.wave.nextWaveTime = 200 * this.tickRate; // Next wave in 200 seconds

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
      const spawnPos = this.getEdgeSpawnPosition(targetPlayer);
      const baseHp = getRequiredMonsterRuntimeConfig(monsterType).stats.baseHp;
      const monster = this.createMonsterState(
        monsterType,
        '',
        targetPlayer.id,
        spawnPos,
        baseHp + waveNumber * 20
      );
      this.registerMonsterState(monster);
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
          this.tryTeleportMonster(monster);
          this.damageMonster(monster, hit.damage, hit.towerId, hit.ownerId);
          this.applyStatusEffects(monster, hit);

          // Process explosion targets
          for (const expTarget of hit.explosionTargets) {
            if (expTarget.targetType && expTarget.targetType !== 'monster') {
              continue;
            }
            const expMonster = this.state.monsters.get(expTarget.id);
            if (expMonster) {
              this.damageMonster(expMonster, expTarget.damage, hit.towerId, hit.ownerId);
              this.applyStatusEffects(expMonster, hit);
            }
          }
        }
      } else if (hit.targetType === 'building' || hit.targetType === 'tower') {
        const pendingBuildingDamage = new Map<string, number>();
        const pendingTowerDamage = new Map<string, number>();

        if (hit.targetType === 'tower') {
          pendingTowerDamage.set(hit.targetId, hit.damage);
        } else {
          pendingBuildingDamage.set(hit.targetId, hit.damage);
        }

        for (const expTarget of hit.explosionTargets) {
          if (expTarget.targetType === 'tower') {
            pendingTowerDamage.set(
              expTarget.id,
              (pendingTowerDamage.get(expTarget.id) ?? 0) + expTarget.damage
            );
            continue;
          }

          pendingBuildingDamage.set(
            expTarget.id,
            (pendingBuildingDamage.get(expTarget.id) ?? 0) + expTarget.damage
          );
        }

        for (const [buildingId, damage] of pendingBuildingDamage) {
          const building = this.state.buildings.get(buildingId);
          if (building && damage > 0) {
            this.damageBuilding(building, damage, hit.towerId);
          }
        }

        for (const [towerId, damage] of pendingTowerDamage) {
          const tower = this.state.towers.get(towerId);
          if (tower && damage > 0) {
            this.damageTower(tower, damage, hit.towerId);
          }
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
      const monster = this.state.monsters.get(result.monsterId);
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
      } else if (result.targetType === 'tower' && result.towerId) {
        const tower = this.state.towers.get(result.towerId);
        if (tower) {
          this.damageTower(tower, result.damage, result.monsterId);
        }
      } else {
        const building = this.state.buildings.get(result.buildingId);
        if (building) {
          this.damageBuilding(building, result.damage, result.monsterId);
        }
      }
      if (monster) {
        if (result.keepAlive) {
          this.applyBombSelf(monster, monster.id);
          if (monster.runtime?.config.baseClass === 'MonsterTerminator') {
            monster.runtime.holdPositionTicks = 1;
          }
        } else {
          this.killMonster(monster, monster.id);
        }
      }
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
   * Periodically send authoritative territory state to each client
   * Runs every TERRITORY_SYNC_INTERVAL ticks (default: 2 seconds)
   */
  private syncTerritoryToClients(): void {
    this.territorySyncCounter++;
    if (this.territorySyncCounter < this.TERRITORY_SYNC_INTERVAL) return;
    this.territorySyncCounter = 0;

    for (const client of this.clients) {
      const playerId = this.resolveTerritorySyncPlayerId(client);
      if (!playerId) continue;

      client.send(
        ServerMessage.TERRITORY_SYNC,
        this.buildTerritorySyncPayload(playerId)
      );
    }
  }

  private resolveTerritorySyncPlayerId(client: Client): string | null {
    if (this.state.players.has(client.sessionId)) {
      return client.sessionId;
    }

    for (const [playerId, player] of this.state.players) {
      if (player.sessionId === client.sessionId) {
        return playerId;
      }
    }

    return null;
  }

  private buildTerritorySyncPayload(playerId: string): TerritorySyncPayload {
    const result = this.territoryCalc.getPlayerResult(playerId);

    return {
      territories: {
        [playerId]: {
          validBuildings: result ? Array.from(result.validBuildings) : [],
          invalidBuildings: result ? Array.from(result.invalidBuildings) : [],
        },
      },
    };
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
      if (monster.runtime) {
        monster.runtime.slowMultiplier = Math.min(monster.runtime.slowMultiplier, hit.freezeMultiplier);
      }
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
        if (monster.runtime) {
          monster.runtime.slowMultiplier = 1;
        }
      }
    }
  }

  private tryTeleportMonster(monster: MonsterState): void {
    const runtime = monster.runtime;
    if (!runtime?.config.teleportingAble) {
      return;
    }

    if (runtime.teleportCharges <= 0) {
      return;
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * runtime.config.teleportingRange;
    monster.position.x += Math.cos(angle) * distance;
    monster.position.y += Math.sin(angle) * distance;
    this.clampMonsterPosition(monster);
    monster.prevX = monster.position.x;
    monster.prevY = monster.position.y;

    runtime.teleportCharges = Math.max(0, runtime.teleportCharges - 1);
  }

  /**
   * Damage a monster
   */
  private damageMonster(
    monster: MonsterState,
    damage: number,
    sourceId: string,
    sourceOwnerId?: string
  ): void {
    const appliedDamage = isTerminatorMonster(monster)
      ? computeTerminatorAppliedDamage(damage, monster)
      : damage;

    if (sourceOwnerId) {
      monster.lastDamageOwnerId = sourceOwnerId;
    }

    monster.hp -= appliedDamage;

    sendToVisible(this, this.visionSystem, ServerMessage.MONSTER_DAMAGED, {
      monsterId: monster.id,
      damage: appliedDamage,
      sourceId,
    }, monster.position.x, monster.position.y);

    if (monster.hp <= 0) {
      this.killMonster(monster, sourceId, sourceOwnerId);
    }
  }

  /**
   * Kill a monster
   */
  private killMonster(monster: MonsterState, killerId: string, killerOwnerId?: string): void {
    if (!this.state.monsters.has(monster.id)) {
      return;
    }

    // Award money to killer - killerId can be a tower ID or bullet owner ID
    // killerOwnerId can be passed directly (e.g. burn kills) to skip tower lookup
    if (!killerOwnerId) {
      const killerTower = this.state.towers.get(killerId);
      killerOwnerId = killerTower?.ownerId || monster.lastDamageOwnerId || '';
    }

    this.applyBombSelf(monster, killerId || monster.id);
    this.spawnMonsterSummons(monster, true);

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
    if (meta) {
      return meta.reward;
    }
    return getRequiredMonsterRuntimeConfig(monsterType).stats.reward;
  }

  /**
   * Remove a monster from state
   */
  private removeMonster(monsterId: string): void {
    const monster = this.state.monsters.get(monsterId);
    if (monster && monster.ownerId === '') {
      this.neutralMonsterCount--;
      if (this.state.wave.isWaveActive) {
        this.state.wave.monstersRemaining--;
      }
    }
    this.state.monsters.delete(monsterId);
  }

  private damageTower(tower: TowerState, damage: number, sourceId: string): void {
    tower.hp -= damage;

    sendToEntityOwnerAndVisible(this, this.visionSystem, ServerMessage.TOWER_DAMAGED, {
      towerId: tower.id,
      damage,
      sourceId,
    }, tower.ownerId, tower.position.x, tower.position.y);

    if (tower.hp <= 0) {
      this.destroyTower(tower, sourceId);
    }
  }

  private destroyTower(tower: TowerState, sourceId: string): void {
    sendToEntityOwnerAndVisible(this, this.visionSystem, ServerMessage.TOWER_DESTROYED, {
      towerId: tower.id,
      sourceId,
    }, tower.ownerId, tower.position.x, tower.position.y);

    this.combatSystem.onTowerRemoved(tower.id);
    this.state.towers.delete(tower.id);
    this.territoryCalc.markDirty();
    this.energyCalc.markDirty();
    this.visionSystem.markDirty();

    console.log(`[GameRoom] Tower destroyed: ${tower.id} by ${sourceId}`);
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

    this.cancelCountdown();
    this.stopGameLoop();
    this.updateRoomPlayingMetadata(false);

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

    if (this.state.phase === GamePhase.STARTING) {
      this.cancelCountdown();
    }
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
    this.countdownInterval = this.clock.setInterval(() => {
      this.state.countdownTicks -= this.tickRate;

      if (this.state.countdownTicks <= 0) {
        this.countdownInterval?.clear();
        this.countdownInterval = null;
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
    this.state.countdownTicks = 0;
    this.state.wave.nextWaveTime = 5 * this.tickRate; // First wave in 5 seconds

    void this.lock().catch((error) => {
      console.error('[GameRoom] Failed to lock room:', error);
    });
    this.updateRoomPlayingMetadata(true);

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
      this.sendActionRejected(client, 'BUILD_TOWER', result.errorMessage || 'Validation failed', result.errorCode, payload.requestId);
      return;
    }

    const player = this.state.getPlayer(client.sessionId)!;
    const cost = result.data?.cost as number;

    // Defensive check: verify money again before deduction
    if (player.money < cost) {
      this.sendActionRejected(client, 'BUILD_TOWER', 'Insufficient money', 'INSUFFICIENT_MONEY', payload.requestId);
      return;
    }

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
      this.sendActionRejected(client, 'BUILD_BUILDING', result.errorMessage || 'Validation failed', result.errorCode, payload.requestId);
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
    building.isSpawner = payload.buildingType === 'MonsterSpawner';

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

    // Defensive check: verify money again before deduction
    if (player.money < upgradeCost) {
      this.sendActionRejected(client, 'UPGRADE_TOWER', 'Insufficient money', 'INSUFFICIENT_MONEY');
      return;
    }

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
      this.sendActionRejected(client, 'SELL_TOWER', result.errorMessage || 'Validation failed', result.errorCode, payload.requestId);
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

    // Defensive check: verify money again before deduction
    if (player.money < cost) {
      this.sendActionRejected(client, 'SPAWN_MONSTER', 'Insufficient money', 'INSUFFICIENT_MONEY');
      return;
    }

    // Deduct money
    player.money -= cost;

    const spawnPos = this.getEdgeSpawnPosition(targetPlayer);
    const monster = this.createMonsterState(
      payload.monsterType,
      client.sessionId,
      payload.targetPlayerId,
      spawnPos
    );
    this.registerMonsterState(monster);
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

    // Validate target position and radius
    const result = this.inputValidator.validateCannonSetAutoTarget(
      client.sessionId,
      payload.towerId,
      payload.targetX,
      payload.targetY,
      payload.radius
    );

    if (!result.valid) {
      this.sendActionRejected(client, 'CANNON_SET_AUTO_TARGET', result.errorMessage || 'Validation failed', result.errorCode);
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
  private sendActionRejected(client: Client, action: string, reason: string, errorCode?: string, requestId?: string): void {
    client.send(ServerMessage.ACTION_REJECTED, { action, reason, errorCode, requestId });
  }
}
