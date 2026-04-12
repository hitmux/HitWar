/**
 * Network World Adapter
 * Core adapter that transforms Colyseus GameState into WorldRendererContext
 *
 * This allows the existing WorldRenderer to render network game state
 * without any modifications to the renderer itself.
 */

import { Camera } from '../../core/camera';
import { Vector } from '../../core/math/vector';
import type { WorldRendererContext } from '../../game/rendering/worldRenderer';
import type { IEffect } from '../../types/game';
import { Territory, type TerritoryWorldLike, type BuildingLike as TerritoryBuildingLike } from '../../systems/territory/territory';
import { TerritoryRenderer } from '../../systems/territory/territoryRenderer';

import {
    TowerRenderProxy,
    MonsterRenderProxy,
    BuildingRenderProxy,
    BulletRenderProxy,
    resetCirclePool,
    type TowerStateView,
    type MonsterStateView,
    type BuildingStateView,
} from './renderProxy';
import { InterpolationSystem, getInterpolationSystem } from './interpolation';
import { LocalEffectsManager, getLocalEffectsManager } from './localEffects';
import { ClientPrediction, getClientPrediction } from './clientPrediction';
import type { NetworkClient } from '../networkClient';
import { NetworkEvent } from '../networkClient';
import { ServerMessage, type BulletFiredPayload, type TerritorySyncPayload } from '../messages';
import { MineRenderProxy } from './mineRenderProxy';
import { NetworkFogProxy } from './networkFog';

// ============================================================================
// Types for Colyseus state access
// ============================================================================

interface MineStateSchemaView {
    id: string;
    position: { x: number; y: number };
    mineState: string;
    ownerId: string;
    level: number;
    hp: number;
    maxHp: number;
    radius: number;
    repairing: boolean;
    repairProgress: number;
    inValidTerritory: boolean;
}

/**
 * Minimal GameState interface for type safety
 * Mirrors the Colyseus GameState schema without importing server code
 */
interface GameStateView {
    mapConfig: { width: number; height: number };
    wave: {
        currentWave: number;
        monstersRemaining: number;
        nextWaveTime: number;
        isWaveActive: boolean;
    };
    players: Map<string, PlayerStateView>;
    towers: Map<string, TowerStateView>;
    monsters: Map<string, MonsterStateView>;
    buildings: Map<string, BuildingStateView>;
    mines?: Map<string, MineStateSchemaView>;
}

interface PlayerStateView {
    id: string;
    money: number;
    isAlive: boolean;
    basePosition: { x: number; y: number };
    energyProduction?: number;
    energyConsumption?: number;
    energySatisfaction?: number;
}

// ============================================================================
// NetworkWorldAdapter
// ============================================================================

/**
 * Adapter that bridges Colyseus GameState to WorldRendererContext
 * Manages proxy entity caches and subsystems
 */
export class NetworkWorldAdapter {
    // Input sources
    private _gameState: GameStateView | null = null;
    private _networkClient: NetworkClient;
    private _localPlayerId: string;

    // Subsystems
    private _interpolation: InterpolationSystem;
    private _localEffects: LocalEffectsManager;
    private _prediction: ClientPrediction;

    // Local camera (player-controlled)
    private _camera: Camera;

    // Render entity caches
    private _towerProxies: Map<string, TowerRenderProxy> = new Map();
    private _monsterProxies: Map<string, MonsterRenderProxy> = new Map();
    private _buildingProxies: Map<string, BuildingRenderProxy> = new Map();

    // Pre-allocated arrays for WorldRendererContext (avoid per-frame allocation)
    private _towerArray: TowerRenderProxy[] = [];
    private _buildingArray: BuildingRenderProxy[] = [];
    private _monsterSet: Set<MonsterRenderProxy> = new Set();
    private _effectSet: Set<IEffect> = new Set();
    private _bulletSet: Set<BulletRenderProxy> = new Set();
    private _mineProxies: Map<string, MineRenderProxy> = new Map();
    private _mineSet: Set<MineRenderProxy> = new Set();

    // Fog of war
    private _fogProxy: NetworkFogProxy | null = null;

    // Territory system
    private _territories: Map<string, Territory> = new Map();
    private _territoryArray: Territory[] = [];

    // User state cache
    private _userState = {
        money: 0,
        putLoc: { x: 0, y: 0, able: false, building: null as { r: number; rangeR: number } | null },
        moveTarget: null as { x: number; y: number; r: number } | null,
    };

    // Time tracking
    private _time: number = 0;

    // Event handlers bound once
    private _eventHandlersBound: boolean = false;
    private _eventUnsubscribers: (() => void)[] = [];


    constructor(
        networkClient: NetworkClient,
        localPlayerId: string,
        viewWidth: number,
        viewHeight: number,
        worldWidth: number = 6000,
        worldHeight: number = 4000
    ) {
        this._networkClient = networkClient;
        this._localPlayerId = localPlayerId;

        this._interpolation = getInterpolationSystem();
        this._localEffects = getLocalEffectsManager();
        this._prediction = getClientPrediction();

        this._camera = new Camera(viewWidth, viewHeight, worldWidth, worldHeight);
    }

    // ==================== Initialization ====================

    /**
     * Bind to Colyseus game state
     * Call this after joining a game room
     */
    bindGameState(gameState: GameStateView): void {
        this._gameState = gameState;

        // Initialize camera from map config
        this._camera = new Camera(
            this._camera.viewWidth,
            this._camera.viewHeight,
            gameState.mapConfig.width,
            gameState.mapConfig.height
        );

        // Center camera on player's base
        const player = gameState.players.get(this._localPlayerId);
        if (player) {
            this._camera.centerOn(new Vector(player.basePosition.x, player.basePosition.y));
        }

        // Initialize interpolation
        this._interpolation.initRenderTime(this._time);

        // Initialize fog of war
        this._fogProxy = new NetworkFogProxy(
            this._localPlayerId,
            this._camera,
            gameState.mapConfig.width,
            gameState.mapConfig.height,
            this._camera.viewWidth,
            this._camera.viewHeight,
        );

        // Initialize territories for all players
        this._initTerritories(gameState);

        // Build initial proxy caches
        this._rebuildAllProxies();
    }

    /**
     * Bind server message handlers for visual effects
     */
    bindEventHandlers(): void {
        // Clean up old event handlers before rebinding (fix reconnection issue)
        if (this._eventHandlersBound) {
            this._eventUnsubscribers.forEach(unsub => unsub());
            this._eventUnsubscribers = [];
        }
        this._eventHandlersBound = true;

        const events = this._networkClient.events;
        const unsubs = this._eventUnsubscribers;

        // Bullet fired events → local bullet effects
        unsubs.push(events.on(ServerMessage.BULLET_FIRED, (...args: unknown[]) => {
            const data = args[0] as BulletFiredPayload;
            const tower = this._towerProxies.get(data.towerId);
            if (tower) {
                // Calculate pseudo-target from velocity for BulletRenderProxy
                const speed = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
                // Server bullet flies maxRange * slideRate (slideRate=2)
                const maxDist = data.maxRange * 2;
                const targetX = data.x + (speed > 0 ? (data.vx / speed) * maxDist : 0);
                const targetY = data.y + (speed > 0 ? (data.vy / speed) * maxDist : 0);

                this._localEffects.onTowerAttack(
                    data.x, data.y,
                    targetX, targetY,
                    data.radius,
                    speed
                );
            }
        }));

        // Monster damaged → hit effect
        unsubs.push(events.on(ServerMessage.MONSTER_DAMAGED, (...args: unknown[]) => {
            const data = args[0] as { monsterId: string; damage: number };
            const monster = this._monsterProxies.get(data.monsterId);
            if (monster) {
                this._localEffects.onMonsterDamaged(monster.pos.x, monster.pos.y, data.damage);
            }
        }));

        // Monster killed → death effect
        unsubs.push(events.on(ServerMessage.MONSTER_KILLED, (...args: unknown[]) => {
            const data = args[0] as { monsterId: string };
            const monster = this._monsterProxies.get(data.monsterId);
            if (monster) {
                this._localEffects.onMonsterKilled(monster.pos.x, monster.pos.y);
            }
        }));

        // Building damaged → damage effect
        unsubs.push(events.on(ServerMessage.BUILDING_DAMAGED, (...args: unknown[]) => {
            const data = args[0] as { buildingId: string; damage: number };
            const building = this._buildingProxies.get(data.buildingId);
            if (building) {
                this._localEffects.onBuildingDamaged(building.pos.x, building.pos.y, data.damage);
            }
        }));

        // Building destroyed → destruction effect
        unsubs.push(events.on(ServerMessage.BUILDING_DESTROYED, (...args: unknown[]) => {
            const data = args[0] as { buildingId: string };
            const building = this._buildingProxies.get(data.buildingId);
            if (building) {
                this._localEffects.onBuildingDestroyed(building.pos.x, building.pos.y);
            }
        }));

        // Action rejected → reject corresponding prediction (prefer requestId matching)
        unsubs.push(events.on(NetworkEvent.ACTION_REJECTED, (...args: unknown[]) => {
            const data = args[0] as { action: string; reason: string; errorCode?: string; requestId?: string };
            switch (data.action) {
                case 'BUILD_TOWER':
                case 'BUILD_BUILDING':
                    if (data.requestId) {
                        if (!this._prediction.rejectBuildByRequestId(data.requestId)) {
                            this._prediction.rejectOldestPendingBuild();
                        }
                    } else {
                        this._prediction.rejectOldestPendingBuild();
                    }
                    break;
                case 'SELL_TOWER':
                    if (data.requestId) {
                        if (!this._prediction.rejectSellByRequestId(data.requestId)) {
                            this._prediction.rejectOldestPendingSell();
                        }
                    } else {
                        this._prediction.rejectOldestPendingSell();
                    }
                    break;
            }
        }));

        // Territory sync from server
        unsubs.push(events.on(ServerMessage.TERRITORY_SYNC, (...args: unknown[]) => {
            const data = args[0] as TerritorySyncPayload;
            this._applyTerritorySync(data);
        }));
    }

    /**
     * Initialize territory system for all players
     */
    private _initTerritories(gameState: GameStateView): void {
        this._territories.clear();

        // Create minimal world-like object for Territory
        const self = this;
        const pseudoWorld: TerritoryWorldLike = {
            width: gameState.mapConfig.width,
            height: gameState.mapConfig.height,
            viewWidth: this._camera.viewWidth,
            viewHeight: this._camera.viewHeight,
            camera: this._camera,
            getBaseBuilding: (playerId?: string) => {
                return self._buildingArray.find(b => b.ownerId === playerId && b.gameType === 'Base') || self._buildingArray[0];
            },
            get batterys() { return self._towerArray as unknown as TerritoryBuildingLike[]; },
            get buildings() { return self._buildingArray as unknown as TerritoryBuildingLike[]; },
            get mines() { return self._mineSet as unknown as Set<TerritoryBuildingLike>; },
            fog: undefined,
        };

        // Create territory for each player
        for (const [playerId] of gameState.players) {
            const territory = new Territory(pseudoWorld, playerId);
            this._territories.set(playerId, territory);
        }

        this._territoryArray = Array.from(this._territories.values());
    }


    /**
     * Apply authoritative territory state from server
     * Directly updates Territory valid/invalid building sets
     */
    private _applyTerritorySync(data: TerritorySyncPayload): void {
        for (const [playerId, territoryData] of Object.entries(data.territories)) {
            const territory = this._territories.get(playerId);
            if (!territory) continue;

            // Clear existing sets
            territory.validBuildings.clear();
            territory.invalidBuildings.clear();

            // Rebuild valid buildings set
            for (const id of territoryData.validBuildings) {
                const entity = this._buildingProxies.get(id) ||
                              this._towerProxies.get(id) ||
                              this._mineProxies.get(id);
                if (entity) {
                    territory.validBuildings.add(entity as unknown as TerritoryBuildingLike);
                    entity.inValidTerritory = true;
                }
            }

            // Rebuild invalid buildings set
            for (const id of territoryData.invalidBuildings) {
                const entity = this._buildingProxies.get(id) ||
                              this._towerProxies.get(id) ||
                              this._mineProxies.get(id);
                if (entity) {
                    territory.invalidBuildings.add(entity as unknown as TerritoryBuildingLike);
                    entity.inValidTerritory = false;
                }
            }

            // Rebuild internal grid cache for fast position queries
            territory.rebuildRefCountGrid();
            territory.renderer.invalidateCache();
        }
    }

    // ==================== Per-Frame Update ====================

    /**
     * Update adapter state each frame
     * Call this before rendering
     */
    update(dt: number): void {
        if (!this._gameState) return;

        this._time += dt;

        // Update subsystems
        this._interpolation.updateRenderTime(dt);
        this._localEffects.update();
        this._prediction.update();

        // Sync proxy caches with server state
        this._syncProxies();

        // Update user state
        this._syncUserState();

        // Build render arrays
        this._buildRenderCollections();

        // Update fog of war (after render collections are built)
        if (this._fogProxy) {
            this._fogProxy.update(this._towerArray, this._buildingArray);
        }

        // Reset circle pool for this frame
        resetCirclePool();
    }

    // ==================== Proxy Cache Management ====================

    /**
     * Full rebuild of all proxy caches (on init or reconnect)
     */
    private _rebuildAllProxies(): void {
        if (!this._gameState) return;

        // Clear all
        this._towerProxies.clear();
        this._monsterProxies.clear();
        this._buildingProxies.clear();
        this._interpolation.clear();

        // Rebuild towers
        for (const [id, tower] of this._gameState.towers) {
            const proxy = new TowerRenderProxy(tower);
            this._towerProxies.set(id, proxy);
            this._interpolation.pushSnapshot(id, tower.position.x, tower.position.y, 0);
        }

        // Rebuild monsters
        for (const [id, monster] of this._gameState.monsters) {
            const proxy = new MonsterRenderProxy(monster);
            this._monsterProxies.set(id, proxy);
            this._interpolation.pushSnapshot(id, monster.position.x, monster.position.y, 0);
        }

        // Rebuild buildings
        for (const [id, building] of this._gameState.buildings) {
            const proxy = new BuildingRenderProxy(building);
            this._buildingProxies.set(id, proxy);
        }
    }

    /**
     * Incremental sync of proxy caches with server state
     */
    private _syncProxies(): void {
        if (!this._gameState) return;

        // Towers: specialized sync with prediction matching
        this._syncTowersWithPrediction();

        // Sync monsters
        this._syncEntityMap(
            this._gameState.monsters,
            this._monsterProxies,
            (state) => new MonsterRenderProxy(state),
            (proxy, state) => proxy.updateFromState(state),
            true
        );

        // Sync buildings
        this._syncEntityMap(
            this._gameState.buildings,
            this._buildingProxies,
            (state) => new BuildingRenderProxy(state),
            (proxy, state) => proxy.updateFromState(state),
            false
        );

        // Sync mines
        this._syncMines();

        // Territory is fully driven by server TERRITORY_SYNC events,
        // no client-side BFS recalculation needed.
    }

    /**
     * Sync mine proxies from GameState.mines
     */
    private _syncMines(): void {
        if (!this._gameState) return;

        const serverMines = this._gameState.mines;

        if (!serverMines) return;

        // Remove proxies for mines no longer on server
        for (const [id] of this._mineProxies) {
            if (!serverMines.has(id)) {
                this._mineProxies.delete(id);
            }
        }

        // Add/update proxies
        serverMines.forEach((mineState, id) => {
            let proxy = this._mineProxies.get(id);
            if (!proxy) {
                proxy = new MineRenderProxy();
                this._mineProxies.set(id, proxy);
            }
            proxy.syncFromSchema(mineState);
        });

        // Rebuild the mine set
        this._mineSet.clear();
        for (const proxy of this._mineProxies.values()) {
            this._mineSet.add(proxy);
        }
    }

    /**
     * Generic entity map sync helper
     */
    private _syncEntityMap<TState extends { id: string; position?: { x: number; y: number } }, TProxy>(
        serverMap: Map<string, TState>,
        proxyMap: Map<string, TProxy>,
        createProxy: (state: TState) => TProxy,
        updateProxy: (proxy: TProxy, state: TState) => void,
        hasPosition: boolean
    ): void {
        // Add new / update existing
        for (const [id, state] of serverMap) {
            const existing = proxyMap.get(id);
            if (existing) {
                updateProxy(existing, state);
            } else {
                proxyMap.set(id, createProxy(state));
                if (hasPosition && state.position) {
                    this._interpolation.pushSnapshot(id, state.position.x, state.position.y, 0);
                }
            }
        }

        // Remove deleted
        for (const id of proxyMap.keys()) {
            if (!serverMap.has(id)) {
                proxyMap.delete(id);
                if (hasPosition) {
                    this._interpolation.removeEntity(id);
                }
            }
        }
    }

    /**
     * Specialized tower sync that integrates with ClientPrediction.
     * New towers from server → confirm matching ghost prediction.
     * Removed towers from server → confirm matching sell prediction.
     */
    private _syncTowersWithPrediction(): void {
        if (!this._gameState) return;
        const serverMap = this._gameState.towers;

        // Add new / update existing
        for (const [id, state] of serverMap) {
            const existing = this._towerProxies.get(id);
            if (existing) {
                existing.updateFromState(state);
            } else {
                // New tower from server - try to match a pending build prediction
                this._prediction.findAndConfirmBuild(
                    state.towerType,
                    state.position.x,
                    state.position.y
                );
                this._towerProxies.set(id, new TowerRenderProxy(state));
                this._interpolation.pushSnapshot(id, state.position.x, state.position.y, 0);
            }
        }

        // Remove deleted
        for (const id of this._towerProxies.keys()) {
            if (!serverMap.has(id)) {
                // Tower removed from server - try to match a pending sell prediction
                this._prediction.findAndConfirmSellByTowerId(id);
                this._towerProxies.delete(id);
                this._interpolation.removeEntity(id);
            }
        }
    }

    /**
     * Sync user state from server
     */
    private _syncUserState(): void {
        if (!this._gameState) return;

        const player = this._gameState.players.get(this._localPlayerId);
        if (player) {
            this._userState.money = player.money;
        }
    }

    /**
     * Build render collections from proxy caches
     */
    private _buildRenderCollections(): void {
        // Build tower array (including ghost towers from predictions)
        this._towerArray.length = 0;
        for (const proxy of this._towerProxies.values()) {
            if (!proxy.isDead()) {
                proxy.updateRadarAngle();
                this._towerArray.push(proxy);
            }
        }
        // Add ghost towers from predictions
        const ghostTowers = this._prediction.getGhostTowers();
        for (const ghost of ghostTowers) {
            this._towerArray.push(ghost as unknown as TowerRenderProxy);
        }

        // Build building array
        this._buildingArray.length = 0;
        for (const proxy of this._buildingProxies.values()) {
            if (!proxy.isDead()) {
                this._buildingArray.push(proxy);
            }
        }

        // Build monster set
        this._monsterSet.clear();
        for (const proxy of this._monsterProxies.values()) {
            if (!proxy.isDead()) {
                this._monsterSet.add(proxy);
            }
        }

        // Build effect set (from local effects manager)
        this._effectSet.clear();
        for (const effect of this._localEffects.effects) {
            this._effectSet.add(effect);
        }

        // Build bullet set (from local effects manager)
        this._bulletSet.clear();
        for (const bullet of this._localEffects.localBullets) {
            this._bulletSet.add(bullet);
        }
    }

    // ==================== WorldRendererContext ====================

    /**
     * Get WorldRendererContext for WorldRenderer
     * This is the main interface consumed by the existing rendering pipeline
     */
    getRendererContext(): WorldRendererContext {
        const mapWidth = this._gameState?.mapConfig.width ?? 6000;
        const mapHeight = this._gameState?.mapConfig.height ?? 4000;

        // Read energy from local player's PlayerState
        const localPlayerState = this._gameState?.players.get(this._localPlayerId);
        const energyProxy = localPlayerState ? {
            getTotalProduction: () => localPlayerState.energyProduction ?? 6,
            getTotalConsumption: () => localPlayerState.energyConsumption ?? 0,
        } : undefined;

        return {
            width: mapWidth,
            height: mapHeight,
            viewWidth: this._camera.viewWidth,
            viewHeight: this._camera.viewHeight,
            camera: this._camera,
            time: this._time,

            // Entity collections
            batterys: this._towerArray as unknown as WorldRendererContext['batterys'],
            buildings: this._buildingArray as unknown as WorldRendererContext['buildings'],
            mines: this._mineSet as unknown as WorldRendererContext['mines'],
            monsters: this._monsterSet as unknown as WorldRendererContext['monsters'],
            effects: this._effectSet,
            allBullys: this._bulletSet as unknown as WorldRendererContext['allBullys'],
            obstacles: [], // Network mode: obstacles managed by server

            // Spatial grids (null = fallback to array traversal)
            monsterGrid: null,
            bullyGrid: null,

            // User state
            user: this._userState,

            // Systems (optional in network mode)
            territory: undefined,
            allTerritories: this._territoryArray.length > 0 ? this._territoryArray : undefined,
            fog: this._fogProxy ?? undefined,
            energy: energyProxy,
            energyRenderer: undefined,
            monsterFlow: this._gameState ? {
                toString: () => `Wave ${this._gameState!.wave.currentWave}`,
                level: this._gameState.wave.currentWave,
                delayTick: this._gameState.wave.nextWaveTime,
            } : undefined,

            // Methods
            syncMonsterRenderListFromSet: undefined,
        };
    }

    // ==================== Public API ====================

    /**
     * Get the camera (for input handling)
     */
    get camera(): Camera {
        return this._camera;
    }

    /**
     * Get the local player ID
     */
    get localPlayerId(): string {
        return this._localPlayerId;
    }

    /** Get the local player's territory for validation */
    getLocalTerritory(): Territory | undefined {
        return this._territories.get(this._localPlayerId);
    }

    /** Check if position is in any player's territory (for enemy territory detection) */
    isPositionInAnyTerritory(pos: Vector, excludePlayerId?: string): boolean {
        for (const [playerId, territory] of this._territories) {
            if (excludePlayerId && playerId === excludePlayerId) continue;
            if (territory.isPositionInAnyTerritory(pos)) return true;
        }
        return false;
    }

    /**
     * Get prediction manager (for UI integration)
     */
    get prediction(): ClientPrediction {
        return this._prediction;
    }

    /**
     * Get local effects manager
     */
    get localEffects(): LocalEffectsManager {
        return this._localEffects;
    }

    /**
     * Get interpolation system
     */
    get interpolation(): InterpolationSystem {
        return this._interpolation;
    }

    /**
     * Update camera viewport size
     */
    updateViewSize(width: number, height: number): void {
        this._camera.updateViewSize(width, height);
        this._fogProxy?.resize(width, height);
    }

    /**
     * Get fog proxy (for Worker rendering initialization)
     */
    getFogProxy(): NetworkFogProxy | null {
        return this._fogProxy;
    }

    /**
     * Get all territory instances (for Worker rendering initialization)
     */
    getAllTerritories(): Territory[] {
        return this._territoryArray;
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        // Remove all event listeners to prevent accumulation on reconnect
        for (const unsub of this._eventUnsubscribers) {
            unsub();
        }
        this._eventUnsubscribers.length = 0;
        this._eventHandlersBound = false;

        this._towerProxies.clear();
        this._monsterProxies.clear();
        this._buildingProxies.clear();
        this._interpolation.clear();
        this._localEffects.clear();
        this._prediction.clear();
        this._fogProxy = null;
        this._gameState = null;
    }

    // ==================== Debug ====================

    /**
     * Get debug info
     */
    getDebugInfo(): Record<string, number> {
        return {
            towers: this._towerProxies.size,
            monsters: this._monsterProxies.size,
            buildings: this._buildingProxies.size,
            interpolations: this._interpolation.getEntityCount(),
            effects: this._localEffects.getEffectCount(),
            localBullets: this._localEffects.getBulletCount(),
            predictions: this._prediction.getPredictionCount(),
        };
    }
}
