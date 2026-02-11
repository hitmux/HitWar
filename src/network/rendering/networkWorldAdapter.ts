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
import { ServerMessage } from '../messages';
import { MineRenderProxy } from './mineRenderProxy';

// ============================================================================
// Types for Colyseus state access
// ============================================================================

/**
 * Minimal GameState interface for type safety
 * Mirrors the Colyseus GameState schema without importing server code
 */
interface GameStateView {
    currentTick: number;
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
        this._interpolation.initRenderTime(Date.now());

        // Build initial proxy caches
        this._rebuildAllProxies();
    }

    /**
     * Bind server message handlers for visual effects
     */
    bindEventHandlers(): void {
        if (this._eventHandlersBound) return;
        this._eventHandlersBound = true;

        const events = this._networkClient.events;

        // Tower attack events → local bullet effects
        events.on(ServerMessage.TOWER_ATTACK, (...args: unknown[]) => {
            const data = args[0] as { towerId: string; targetId: string; targetX: number; targetY: number };
            const tower = this._towerProxies.get(data.towerId);
            if (tower) {
                this._localEffects.onTowerAttack(
                    tower.pos.x,
                    tower.pos.y,
                    data.targetX,
                    data.targetY
                );
            }
        });

        // Monster damaged → hit effect
        events.on(ServerMessage.MONSTER_DAMAGED, (...args: unknown[]) => {
            const data = args[0] as { monsterId: string; damage: number };
            const monster = this._monsterProxies.get(data.monsterId);
            if (monster) {
                this._localEffects.onMonsterDamaged(monster.pos.x, monster.pos.y, data.damage);
            }
        });

        // Monster killed → death effect
        events.on(ServerMessage.MONSTER_KILLED, (...args: unknown[]) => {
            const data = args[0] as { monsterId: string };
            const monster = this._monsterProxies.get(data.monsterId);
            if (monster) {
                this._localEffects.onMonsterKilled(monster.pos.x, monster.pos.y);
            }
        });

        // Building damaged → damage effect
        events.on(ServerMessage.BUILDING_DAMAGED, (...args: unknown[]) => {
            const data = args[0] as { buildingId: string; damage: number };
            const building = this._buildingProxies.get(data.buildingId);
            if (building) {
                this._localEffects.onBuildingDamaged(building.pos.x, building.pos.y, data.damage);
            }
        });

        // Building destroyed → destruction effect
        events.on(ServerMessage.BUILDING_DESTROYED, (...args: unknown[]) => {
            const data = args[0] as { buildingId: string };
            const building = this._buildingProxies.get(data.buildingId);
            if (building) {
                this._localEffects.onBuildingDestroyed(building.pos.x, building.pos.y);
            }
        });

        // Action rejected → reject corresponding prediction
        events.on(NetworkEvent.ACTION_REJECTED, (...args: unknown[]) => {
            const data = args[0] as { action: string; reason: string; errorCode?: string };
            switch (data.action) {
                case 'BUILD_TOWER':
                    this._prediction.rejectOldestPendingBuild();
                    break;
                case 'SELL_TOWER':
                    this._prediction.rejectOldestPendingSell();
                    break;
            }
        });
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
    }

    /**
     * Sync mine proxies from GameState.mines
     */
    private _syncMines(): void {
        if (!this._gameState) return;

        const serverMines = (this._gameState as Record<string, unknown>).mines as
            Map<string, { id: string; position: { x: number; y: number }; mineState: string; ownerId: string; level: number; hp: number; maxHp: number; radius: number; repairing: boolean; repairProgress: number }> | undefined;

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
            fog: undefined,
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
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        this._towerProxies.clear();
        this._monsterProxies.clear();
        this._buildingProxies.clear();
        this._interpolation.clear();
        this._localEffects.clear();
        this._prediction.clear();
        this._gameState = null;
        this._eventHandlersBound = false;
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
