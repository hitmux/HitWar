/**
 * World class - Game world management (Facade pattern)
 * by littlefean
 * 
 * 重构后的 World 类作为门面持有各管理器的引用：
 * - SpatialQuerySystem: 空间查询
 * - EntityManager: 实体管理
 * - WaveManager: 波次管理
 * - WorldRenderer: 渲染系统
 */

// Core imports
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { Camera } from '../core/camera';
import { QuadTree } from '../core/physics/quadTree';
import { SpatialHashGrid } from '../core/physics/spatialHashGrid';
import { Obstacle } from '../core/physics/obstacle';
import { PR } from '../core/staticInitData';

// Manager imports
import { SpatialQuerySystem } from './spatial';
import { EntityManager } from './entities';
import { WaveManager, type MonsterFlow } from './waves';
import { WorldRenderer, type WorldRendererContext } from './rendering';

// Buildings imports
import { BuildingFinallyCompat } from '../buildings/index';

// Systems imports
import { Territory } from '../systems/territory/territory';
import { MultiPlayerTerritory } from '../systems/territory/multiPlayerTerritory';
import { Energy } from '../systems/energy/energy';
import { MultiPlayerEnergy } from '../systems/energy/multiPlayerEnergy';
import { EnergyRenderer } from '../systems/energy/energyRenderer';
import { Mine } from '../systems/energy/mine';
import { FogOfWar } from '../systems/fog';
import { MultiPlayerFogOfWar } from '../systems/fog/multiPlayerFogOfWar';

// Player imports
import { PlayerManager } from './player/playerManager';
import type { PlayerConfig } from '../types/player';

// Type definitions (local interfaces used by World)
interface UserState {
    money: number;
    putLoc: {
        x: number;
        y: number;
        able: boolean;
        building: { r: number; rangeR: number } | null;
    };
    /** 移动模式下选中的建筑位置和半径 */
    moveTarget: { x: number; y: number; r: number } | null;
}

interface CheatModeState {
    enabled: boolean;
    priceMultiplier: number;
    infiniteHp: boolean;
    disableEnergy: boolean;
}

/**
 * World initialization options for multiplayer support
 */
interface WorldOptions {
    isMultiplayer?: boolean;
    playerConfigs?: PlayerConfig[];
}

// Import entity interfaces from EntityManager
import type {
    TowerLike,
    BuildingLike,
    MonsterLike,
    BullyLike,
    IEffect
} from './entities';

// Re-export for backward compatibility
export type { TowerLike, BuildingLike, MonsterLike, BullyLike, IEffect };

export class World {
    // Cached font string to avoid repeated string creation (backward compat)
    static FONT_16 = "16px Microsoft YaHei";

    // Precomputed math constant: Math.log(1 + Math.E)
    static readonly _LOG_1_PLUS_E = Math.log(1 + Math.E);

    // === Manager Instances (new architecture) ===
    private readonly _spatialSystem: SpatialQuerySystem;
    private readonly _entityManager: EntityManager;
    private readonly _waveManager: WaveManager;
    private readonly _renderer: WorldRenderer;

    // World dimensions
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;

    // Camera
    camera: Camera;

    // Game state
    time: number;
    mode: string;
    gameSpeed: number;

    // Obstacles
    obstacles: Obstacle[];

    // Root building
    rootBuilding!: BuildingLike;

    // Territory and energy systems
    territory!: Territory;
    energy!: Energy;
    energyRenderer!: EnergyRenderer;

    // Fog of war system
    fog!: FogOfWar;

    // === Multiplayer Systems (optional) ===
    private _playerManager: PlayerManager | null = null;
    private _multiTerritory: MultiPlayerTerritory | null = null;
    private _multiEnergy: MultiPlayerEnergy | null = null;
    private _multiFog: MultiPlayerFogOfWar | null = null;

    // User state
    user: UserState;

    // Cheat mode
    cheatMode: CheatModeState;

    // === Backward Compatible Proxy Properties ===
    // Entity collections (proxied to EntityManager)
    get batterys(): TowerLike[] { return this._entityManager.batterys; }
    set batterys(value: TowerLike[]) { this._entityManager.batterys = value; }
    get buildings(): BuildingLike[] { return this._entityManager.buildings; }
    set buildings(value: BuildingLike[]) { this._entityManager.buildings = value; }
    get mines(): Set<Mine> { return this._entityManager.mines; }
    set mines(value: Set<Mine>) { this._entityManager.mines = value; }
    get monsters(): Set<MonsterLike> { return this._entityManager.monsters; }
    set monsters(value: Set<MonsterLike>) { this._entityManager.monsters = value; }
    get effects(): Set<IEffect> { return this._entityManager.effects; }
    get othersBullys(): BullyLike[] { return this._entityManager.othersBullys; }
    get allBullys(): Set<BullyLike> { return this._entityManager.allBullys; }

    // Spatial indices (proxied to SpatialQuerySystem)
    get buildingQuadTree(): QuadTree | null { return this._spatialSystem.buildingQuadTree; }
    get monsterGrid(): SpatialHashGrid<MonsterLike> | null { return this._spatialSystem.monsterGrid as any; }
    get bullyGrid(): SpatialHashGrid<BullyLike> | null { return this._spatialSystem.bullyGrid as any; }

    // Wave properties (proxied to WaveManager)
    get monsterFlow(): MonsterFlow { return this._waveManager.monsterFlow; }
    set monsterFlow(value: MonsterFlow) { this._waveManager.monsterFlow = value; }
    get monsterFlowNext(): MonsterFlow { return this._waveManager.monsterFlowNext; }
    set monsterFlowNext(value: MonsterFlow) { this._waveManager.monsterFlowNext = value; }
    get haveFlow(): boolean { return this._waveManager.haveFlow; }
    set haveFlow(value: boolean) { this._waveManager.haveFlow = value; }
    get monsterAddFreezeTick(): number { return this._waveManager.monsterAddFreezeTick; }
    set monsterAddFreezeTick(value: number) { this._waveManager.monsterAddFreezeTick = value; }
    get monsterPreAdd(): number { return this._waveManager.monsterPreAdd; }
    set monsterPreAdd(value: number) { this._waveManager.monsterPreAdd = value; }
    get maxMonsterNum(): number { return this._waveManager.maxMonsterNum; }
    set maxMonsterNum(value: number) { this._waveManager.maxMonsterNum = value; }

    // FPS/TPS tracking (proxied to WorldRenderer)
    get _frameCount(): number { return 0; }  // Deprecated, use _renderer.fps
    get _fps(): number { return this._renderer.fps; }
    get _lastTickCount(): number { return 0; }  // Deprecated
    get _tps(): number { return this._renderer.tps; }
    _statsUpdateInterval: number = 1000;  // Deprecated
    _lastStatsUpdate: number = 0;  // Deprecated

    // Precomputed world constants (for Monster.move() optimization)
    readonly maxDimension: number = 0;
    readonly minMonsterRadius: number = 0;
    readonly maxMonsterRadius: number = 0;
    readonly monsterRadiusRange: number = 0;
    readonly worldCenterX: number = 0;
    readonly worldCenterY: number = 0;

    constructor(worldWidth: number, worldHeight: number, viewWidth?: number, viewHeight?: number, options?: WorldOptions) {
        // World size (game logic space)
        this.width = worldWidth;
        this.height = worldHeight;

        // Viewport size (canvas size)
        this.viewWidth = viewWidth || worldWidth;
        this.viewHeight = viewHeight || worldHeight;

        // Precompute world constants (used by Monster.move())
        (this as any).maxDimension = Math.max(this.width, this.height);
        (this as any).minMonsterRadius = this.maxDimension * 0.25;
        (this as any).maxMonsterRadius = this.maxDimension * 0.8;
        (this as any).monsterRadiusRange = this.maxMonsterRadius - this.minMonsterRadius;
        (this as any).worldCenterX = this.width / 2;
        (this as any).worldCenterY = this.height / 2;

        // Camera
        this.camera = new Camera(this.viewWidth, this.viewHeight, this.width, this.height);

        // === Initialize Managers ===
        // 1. Spatial Query System (no dependencies)
        this._spatialSystem = new SpatialQuerySystem({ width: this.width, height: this.height });

        // 2. Entity Manager (depends on SpatialQuerySystem)
        // Note: territory will be set after Territory is created
        this._entityManager = new EntityManager(this._spatialSystem, {});

        this.time = 0;
        this.mode = "normal";

        // Obstacles (initialized after rootBuilding)
        this.obstacles = [];

        // === Initialize Player Manager ===
        this._playerManager = new PlayerManager();

        // Check if multiplayer mode
        if (options?.isMultiplayer && options.playerConfigs && options.playerConfigs.length > 0) {
            this._initMultiplayer(options.playerConfigs);
        } else {
            this._initSinglePlayer();
        }

        // Update EntityManager context with territory
        (this._entityManager as any)._context = { territory: this.territory };

        // Center camera on root building
        this.camera.centerOn(this.rootBuilding.pos);

        this.user = {
            money: 1000,
            putLoc: { x: 0, y: 0, able: false, building: null },
            moveTarget: null
        };

        // 3. Wave Manager (depends on EntityManager and World)
        this._waveManager = new WaveManager(
            { width: this.width, height: this.height, mode: this.mode, get time() { return 0; } },
            {
                addMonster: (m) => this.addMonster(m as MonsterLike),
                addEffect: (e) => this.addEffect(e as IEffect)
            },
            this as any
        );
        // Update WaveManager context to use World's time
        (this._waveManager as any)._context = {
            width: this.width,
            height: this.height,
            mode: this.mode,
            get time() { return 0; }  // Will be patched below
        };
        // Use Object.defineProperty to make time dynamic
        Object.defineProperty((this._waveManager as any)._context, 'time', {
            get: () => this.time
        });

        // Game speed multiplier
        this.gameSpeed = 1;

        // Cheat mode settings
        this.cheatMode = {
            enabled: false,
            priceMultiplier: 1.0,
            infiniteHp: false,
            disableEnergy: false
        };

        // 4. World Renderer (depends on all other systems)
        this._renderer = new WorldRenderer(this._createRendererContext());

        // Initial static layer rebuild
        this._renderer.markStaticLayerDirty();
    }

    /**
     * Initialize single-player mode (default)
     */
    private _initSinglePlayer(): void {
        this._playerManager!.initSinglePlayer();

        // Place root building at center
        let RootBuilding = BuildingFinallyCompat.Root!(this as any) as any;
        RootBuilding.pos = new Vector(this.width / 2, this.height / 2);
        this.rootBuilding = RootBuilding as BuildingLike;
        this.addBuilding(this.rootBuilding);

        // Territory system (must be created after rootBuilding)
        this.territory = new Territory(this as any);

        // Fog of war system (must be created after rootBuilding)
        this.fog = new FogOfWar(this as any);

        // Generate obstacles (must be after rootBuilding)
        this.obstacles = Obstacle.generateRandom(this as any);

        // Generate mines (must be after obstacles)
        this.generateMines();

        // Energy system (must be created after mines)
        this.energy = new Energy(this as any);
        this.energyRenderer = new EnergyRenderer(this as any);
    }

    /**
     * Initialize multiplayer mode
     */
    private _initMultiplayer(configs: PlayerConfig[]): void {
        this._playerManager!.initMultiplayer(configs);
        const playerIds = configs.map(c => c.id);
        const localPlayerId = this._playerManager!.localPlayerId;

        // Create base buildings for each player
        for (const config of configs) {
            this._createBaseForPlayer(config);
        }

        // Generate obstacles with pseudo-symmetric layout (before mines)
        this._generatePseudoSymmetricObstacles(configs);

        // Generate mines with pseudo-symmetric layout
        this._generatePseudoSymmetricMines(configs);

        // Create multiplayer system managers
        this._multiTerritory = new MultiPlayerTerritory(this as any, playerIds);
        this._multiFog = new MultiPlayerFogOfWar(this as any, playerIds, localPlayerId);
        this._multiEnergy = new MultiPlayerEnergy(this as any, playerIds);

        // Facade compatibility: point to local player's instances
        this.territory = this._multiTerritory.getTerritory(localPlayerId)!;
        this.fog = this._multiFog.getLocalFog()!;
        this.energy = this._multiEnergy.getEnergy(localPlayerId)!;

        // Energy renderer uses local player's energy
        this.energyRenderer = new EnergyRenderer(this as any);
    }

    /**
     * Create base building for a player (multiplayer)
     */
    private _createBaseForPlayer(config: PlayerConfig): void {
        const RootBuilding = BuildingFinallyCompat.Root!(this as any) as any;
        RootBuilding.pos = new Vector(config.basePosition.x, config.basePosition.y);
        RootBuilding.ownerId = config.id;

        if (!this.rootBuilding) {
            // First player's base becomes rootBuilding for backward compatibility
            this.rootBuilding = RootBuilding as BuildingLike;
        }

        this.addBuilding(RootBuilding as BuildingLike);
        this._playerManager!.setBaseBuilding(RootBuilding, config.id);
    }

    /**
     * Generate pseudo-symmetric obstacles for multiplayer
     * Each side has independent random placement but same count and density
     */
    private _generatePseudoSymmetricObstacles(configs: PlayerConfig[]): void {
        const basePositions = configs.map(c => new Vector(c.basePosition.x, c.basePosition.y));
        this.obstacles = Obstacle.generatePseudoSymmetric(this as any, basePositions);
    }

    /**
     * Generate pseudo-symmetric mines for multiplayer
     * Each side has independent random placement but same count
     */
    private _generatePseudoSymmetricMines(configs: PlayerConfig[]): void {
        const basePositions = configs.map(c => new Vector(c.basePosition.x, c.basePosition.y));
        this.generateMinesPseudoSymmetric(basePositions);
    }

    /**
     * Create renderer context object that provides access to World's properties
     */
    private _createRendererContext(): WorldRendererContext {
        const world = this;
        return {
            get width() { return world.width; },
            get height() { return world.height; },
            get viewWidth() { return world.viewWidth; },
            get viewHeight() { return world.viewHeight; },
            get camera() { return world.camera; },
            get time() { return world.time; },
            get batterys() { return world.batterys; },
            get buildings() { return world.buildings; },
            get mines() { return world.mines; },
            get monsters() { return world.monsters; },
            get effects() { return world.effects; },
            get allBullys() { return world.allBullys; },
            get obstacles() { return world.obstacles; },
            get monsterGrid() { return world.monsterGrid; },
            get bullyGrid() { return world.bullyGrid; },
            get user() { return world.user; },
            get territory() { return world.territory; },
            get fog() { return world.fog; },
            get energy() { return world.energy; },
            get energyRenderer() { return world.energyRenderer; },
            get monsterFlow() { return world.monsterFlow; },
            syncMonsterRenderListFromSet: () => world._entityManager.syncMonsterRenderListFromSet()
        };
    }

    resizeCanvas(canvasElement: HTMLCanvasElement): void {
        canvasElement.width = this.viewWidth * PR;
        canvasElement.height = this.viewHeight * PR;
        canvasElement.style.width = this.viewWidth + "px";
        canvasElement.style.height = this.viewHeight + "px";

        if (this.camera) {
            this.camera.updateViewSize(this.viewWidth, this.viewHeight);
        }
    }

    /**
     * Get all friendly entities
     * @delegate EntityManager
     */
    getAllBuildingArr(): (TowerLike | BuildingLike)[] {
        return this._entityManager.getAllBuildingArr();
    }

    /**
     * Get all friendly bullets as array
     * @deprecated Use this.allBullys instead to avoid rebuilding array
     * @delegate EntityManager
     */
    getAllBullyToArr(): BullyLike[] {
        return this._entityManager.getAllBullyToArr();
    }

    /**
     * Add a tower to the world
     * @delegate EntityManager
     */
    addTower(battery: TowerLike): void {
        this._entityManager.addTower(battery);
        this._renderer.markStaticLayerDirty();
    }

    /**
     * Add a monster to the world
     * @delegate EntityManager
     */
    addMonster(monster: MonsterLike): void {
        this._entityManager.addMonster(monster);
    }

    /**
     * Remove a monster from the world
     * @delegate EntityManager
     */
    removeMonster(monster: MonsterLike): void {
        this._entityManager.removeMonster(monster);
    }

    /**
     * Add an effect to the world
     * @delegate EntityManager
     */
    addEffect(effect: IEffect): void {
        this._entityManager.addEffect(effect);
    }

    /**
     * Add money to the owner (multiplayer compatible)
     * In single-player mode, ownerId is ignored and money goes to world.user
     * In multiplayer mode, money is dispatched to the correct player via PlayerManager
     */
    addMoneyToOwner(ownerId: string | null, amount: number): void {
        if (Number.isNaN(amount)) {
            console.error('[World.addMoneyToOwner] NaN detected! ownerId:', ownerId, new Error().stack);
            return;
        }
        if (this._playerManager?.isMultiplayer) {
            // Multiplayer mode: dispatch to the correct player
            if (ownerId) {
                this._playerManager.addMoney(amount, ownerId);
            }
            // null ownerId (neutral kills) - no reward in multiplayer
        } else {
            // Single-player mode: always add to the main user
            this.user.money += amount;
        }
    }

    /**
     * Get the current player's money
     * In multiplayer, this will return the local player's money
     */
    getMoney(): number {
        return this.user.money;
    }

    /**
     * Set the current player's money (for save/load and initialization)
     * In multiplayer, this will set the local player's money
     */
    setMoney(amount: number): void {
        if (Number.isNaN(amount)) {
            console.error('[World.setMoney] NaN detected!', new Error().stack);
            return;
        }
        this.user.money = amount;
    }

    /**
     * Add money to the current player
     * In multiplayer, this will add to the local player's money
     */
    addMoney(amount: number): void {
        if (Number.isNaN(amount)) {
            console.error('[World.addMoney] NaN detected!', new Error().stack);
            return;
        }
        this.user.money += amount;
    }

    /**
     * Spend money from the current player
     * Returns true if the player had enough money, false otherwise
     * If force is true, money will be set to 0 when insufficient
     */
    spendMoney(amount: number, force: boolean = false): boolean {
        if (Number.isNaN(amount)) {
            console.error('[World.spendMoney] NaN detected!', new Error().stack);
            return false;
        }
        if (this.user.money >= amount) {
            this.user.money -= amount;
            return true;
        }
        if (force) {
            this.user.money = 0;
            return true;
        }
        return false;
    }

    /**
     * Get the base building for a player
     * In single-player, always returns rootBuilding
     * In multiplayer, returns the specified player's base
     */
    getBaseBuilding(playerId?: string): BuildingLike {
        if (this._playerManager?.isMultiplayer && playerId) {
            const base = this._playerManager.getBaseBuilding(playerId);
            if (base) return base as unknown as BuildingLike;
        }
        return this.rootBuilding;
    }

    /**
     * Get the Energy instance for a specific owner
     * Used by towers to calculate damage multiplier based on owner's energy satisfaction
     * In multiplayer, returns the energy system for the owner's player
     * In single-player, always returns the global energy instance
     */
    getEnergyForOwner(ownerId: string | null): Energy {
        if (this._multiEnergy && ownerId) {
            return this._multiEnergy.getEnergy(ownerId) ?? this.energy;
        }
        return this.energy;
    }

    /**
     * Get the MultiPlayerTerritory manager (for build cost calculation)
     * Returns null in single-player mode
     */
    getMultiTerritory(): MultiPlayerTerritory | null {
        return this._multiTerritory;
    }

    /**
     * Get the PlayerManager (for accessing player data)
     */
    getPlayerManager(): PlayerManager | null {
        return this._playerManager;
    }

    // =========================================================================
    // Building Death Handling (for multiplayer win/lose conditions)
    // =========================================================================

    /** Game result after a building death (for UI to display) */
    private _lastGameResult: import('./player/playerManager').GameResult | null = null;

    /**
     * Get the last game result (for UI to check)
     */
    getLastGameResult(): import('./player/playerManager').GameResult | null {
        return this._lastGameResult;
    }

    /**
     * Clear the game result (after UI has processed it)
     */
    clearGameResult(): void {
        this._lastGameResult = null;
    }

    /**
     * Handle building death - check if base building was destroyed
     */
    private _handleBuildingDied(building: any): void {
        if (!this._playerManager) return;

        // Check if this was a base building
        const result = this._playerManager.onBuildingDestroyed(building);
        if (result) {
            this._lastGameResult = result;

            // If a player was eliminated, redistribute monsters
            if (!result.ended) {
                // Game not over yet, redistribute wave targets
                for (const player of this._playerManager.getAllPlayers()) {
                    if (!player.isAlive && player.baseBuilding === building) {
                        this._waveManager.redistributeOnPlayerElimination(player.id);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Handle tower death - check if base building was destroyed (tower can be base)
     */
    private _handleTowerDied(tower: any): void {
        // Towers can also be base buildings in some configurations
        this._handleBuildingDied(tower);
    }

    /**
     * Add bullet to global cache
     * @delegate EntityManager
     */
    addBully(bully: BullyLike): void {
        this._entityManager.addBully(bully);
    }

    /**
     * Remove bullet from global cache
     * @delegate EntityManager
     */
    removeBully(bully: BullyLike): void {
        this._entityManager.removeBully(bully);
    }

    /**
     * Mark moving spatial object dirty so grid can update lazily
     * @delegate EntityManager
     */
    markSpatialDirty(entity: any): void {
        this._entityManager.markSpatialDirty(entity);
    }

    /**
     * Check if position overlaps with obstacles
     */
    isPositionOnObstacle(pos: Vector, radius: number): boolean {
        let testCircle = new Circle(pos.x, pos.y, radius);
        for (let obs of this.obstacles) {
            if (obs.intersectsCircle(testCircle)) return true;
        }
        return false;
    }

    /**
     * Check if position overlaps with existing buildings/towers/mines
     */
    isPositionOnBuilding(pos: Vector, radius: number): boolean {
        for (let t of this.batterys) {
            const tc = (t as any).getBodyCircle();
            if (Circle.collides(pos.x, pos.y, radius, tc.x, tc.y, tc.r)) return true;
        }
        for (let b of this.buildings) {
            const bc = b.getBodyCircle();
            if (Circle.collides(pos.x, pos.y, radius, bc.x, bc.y, bc.r)) return true;
        }
        for (let m of this.mines) {
            const combinedR = radius + m.r;
            if (pos.disSq(m.pos) < combinedR * combinedR) return true;
        }
        return false;
    }

    /**
     * Generate mines
     */
    generateMines(): void {
        const totalCount = 165 + Math.floor(Math.random() * 16);
        const minDistFromRoot = 200;
        const minDistFromEdge = 100;
        // Guaranteed mines near root: 100-300 distance
        const guaranteedMinDist = 100;
        const guaranteedMaxDist = 300;
        const guaranteedNearRootCount = 3;
        const maxAttempts = 100;

        // First generate guaranteed mines near root
        let nearRootGenerated = 0;
        let attempts = 0;

        while (nearRootGenerated < guaranteedNearRootCount && attempts < maxAttempts * guaranteedNearRootCount) {
            const angle = Math.random() * Math.PI * 2;
            const dist = guaranteedMinDist + Math.random() * (guaranteedMaxDist - guaranteedMinDist);
            const x = this.rootBuilding.pos.x + Math.cos(angle) * dist;
            const y = this.rootBuilding.pos.y + Math.sin(angle) * dist;
            const pos = new Vector(x, y);
            attempts++;

            if (x < minDistFromEdge || x > this.width - minDistFromEdge ||
                y < minDistFromEdge || y > this.height - minDistFromEdge) {
                continue;
            }
            if (this.isPositionOnObstacle(pos, 25) || this.isPositionOnBuilding(pos, 25)) {
                continue;
            }

            this.mines.add(new Mine(pos, this as any));
            nearRootGenerated++;
        }

        // Use grid partitioning for even distribution
        const remainingCount = totalCount - nearRootGenerated;
        const effectiveWidth = this.width - 2 * minDistFromEdge;
        const effectiveHeight = this.height - 2 * minDistFromEdge;

        const gridCols = Math.ceil(Math.sqrt(remainingCount * effectiveWidth / effectiveHeight));
        const gridRows = Math.ceil(remainingCount / gridCols);
        const cellWidth = effectiveWidth / gridCols;
        const cellHeight = effectiveHeight / gridRows;

        // Create all cell indices and shuffle
        let cellIndices: number[] = [];
        for (let i = 0; i < gridCols * gridRows; i++) {
            cellIndices.push(i);
        }
        // Fisher-Yates shuffle
        for (let i = cellIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
        }

        // Generate mines in shuffled cells
        let generated = 0;
        for (let idx of cellIndices) {
            if (generated >= remainingCount) break;

            const col = idx % gridCols;
            const row = Math.floor(idx / gridCols);

            const margin = 20;
            const baseX = minDistFromEdge + col * cellWidth;
            const baseY = minDistFromEdge + row * cellHeight;

            attempts = 0;
            let placed = false;

            while (!placed && attempts < maxAttempts) {
                const x = baseX + margin + Math.random() * (cellWidth - 2 * margin);
                const y = baseY + margin + Math.random() * (cellHeight - 2 * margin);
                const pos = new Vector(x, y);
                attempts++;

                if (pos.disSq(this.rootBuilding.pos) < minDistFromRoot * minDistFromRoot) {
                    continue;
                }
                if (this.isPositionOnObstacle(pos, 25) || this.isPositionOnBuilding(pos, 25)) {
                    continue;
                }

                this.mines.add(new Mine(pos, this as any));
                generated++;
                placed = true;
            }
        }
    }

    /**
     * Generate mines with pseudo-symmetric layout for multiplayer
     * Each half has independent random placement but same count
     * @param basePositions Array of base positions (typically 2 for 2-player)
     */
    generateMinesPseudoSymmetric(basePositions: Vector[]): void {
        if (basePositions.length < 2) {
            // Fallback to normal generation for single player
            this.generateMines();
            return;
        }

        const centerX = this.width / 2;
        const minDistFromEdge = 100;
        const minDistFromBase = 200;
        const maxAttempts = 100;

        // Total mines to generate on each side
        const minesPerSide = 80;

        // Generate guaranteed mines near each base
        const guaranteedNearBase = 3;
        const guaranteedMinDist = 100;
        const guaranteedMaxDist = 300;

        for (const basePos of basePositions) {
            let generated = 0;
            let attempts = 0;

            while (generated < guaranteedNearBase && attempts < maxAttempts * guaranteedNearBase) {
                const angle = Math.random() * Math.PI * 2;
                const dist = guaranteedMinDist + Math.random() * (guaranteedMaxDist - guaranteedMinDist);
                const x = basePos.x + Math.cos(angle) * dist;
                const y = basePos.y + Math.sin(angle) * dist;
                const pos = new Vector(x, y);
                attempts++;

                if (x < minDistFromEdge || x > this.width - minDistFromEdge ||
                    y < minDistFromEdge || y > this.height - minDistFromEdge) {
                    continue;
                }
                if (this.isPositionOnObstacle(pos, 25) || this.isPositionOnBuilding(pos, 25)) {
                    continue;
                }

                this.mines.add(new Mine(pos, this as any));
                generated++;
            }
        }

        // Generate remaining mines on left side (x < centerX - 100)
        this._generateMinesInRegion(minDistFromEdge, centerX - 100, minDistFromEdge, this.height - minDistFromEdge,
            minesPerSide - guaranteedNearBase, basePositions, minDistFromBase);

        // Generate remaining mines on right side (x > centerX + 100)
        this._generateMinesInRegion(centerX + 100, this.width - minDistFromEdge, minDistFromEdge, this.height - minDistFromEdge,
            minesPerSide - guaranteedNearBase, basePositions, minDistFromBase);

        // Generate mines in middle contested zone
        this._generateMinesInRegion(centerX - 100, centerX + 100, minDistFromEdge, this.height - minDistFromEdge,
            10, basePositions, minDistFromBase);
    }

    /**
     * Generate mines in a specific region with grid distribution
     */
    private _generateMinesInRegion(
        minX: number, maxX: number, minY: number, maxY: number,
        count: number, basePositions: Vector[], minDistFromBase: number
    ): void {
        const effectiveWidth = maxX - minX;
        const effectiveHeight = maxY - minY;

        if (effectiveWidth <= 0 || effectiveHeight <= 0 || count <= 0) return;

        const gridCols = Math.max(1, Math.ceil(Math.sqrt(count * effectiveWidth / effectiveHeight)));
        const gridRows = Math.max(1, Math.ceil(count / gridCols));
        const cellWidth = effectiveWidth / gridCols;
        const cellHeight = effectiveHeight / gridRows;

        // Shuffle cell indices
        let cellIndices: number[] = [];
        for (let i = 0; i < gridCols * gridRows; i++) {
            cellIndices.push(i);
        }
        for (let i = cellIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
        }

        let generated = 0;
        const maxAttempts = 100;

        for (const idx of cellIndices) {
            if (generated >= count) break;

            const col = idx % gridCols;
            const row = Math.floor(idx / gridCols);

            const margin = 20;
            const baseX = minX + col * cellWidth;
            const baseY = minY + row * cellHeight;

            let attempts = 0;
            let placed = false;

            while (!placed && attempts < maxAttempts) {
                const x = baseX + margin + Math.random() * Math.max(0, cellWidth - 2 * margin);
                const y = baseY + margin + Math.random() * Math.max(0, cellHeight - 2 * margin);
                const pos = new Vector(x, y);
                attempts++;

                // Check distance from all bases
                let tooCloseToBase = false;
                for (const basePos of basePositions) {
                    if (pos.disSq(basePos) < minDistFromBase * minDistFromBase) {
                        tooCloseToBase = true;
                        break;
                    }
                }
                if (tooCloseToBase) continue;

                if (this.isPositionOnObstacle(pos, 25) || this.isPositionOnBuilding(pos, 25)) {
                    continue;
                }

                this.mines.add(new Mine(pos, this as any));
                generated++;
                placed = true;
            }
        }
    }

    /**
     * Add a building to the world
     * @delegate EntityManager
     */
    addBuilding(building: BuildingLike): void {
        this._entityManager.addBuilding(building);
        this._renderer?.markStaticLayerDirty();
    }

    /**
     * Update spatial indices for collision queries
     * @delegate SpatialQuerySystem
     */
    rebuildQuadTrees(): void {
        this._spatialSystem.rebuildQuadTrees(
            this.buildings as any,
            this.batterys as any,
            this.monsters as any,
            this.allBullys as any
        );
    }

    /**
     * Get monsters near a position using spatial hash grid
     * @delegate SpatialQuerySystem
     */
    getMonstersInRange(x: number, y: number, radius: number): unknown[] {
        return this._spatialSystem.getMonstersInRange(x, y, radius, this.monsters as any);
    }

    /**
     * Get buildings near a position using quadtree
     * @delegate SpatialQuerySystem
     */
    getBuildingsInRange(x: number, y: number, radius: number): unknown[] {
        return this._spatialSystem.getBuildingsInRange(x, y, radius, this.getAllBuildingArr() as any);
    }

    /**
     * Get bullets in range using spatial hash grid
     * @delegate SpatialQuerySystem
     */
    getBullysInRange(x: number, y: number, radius: number): unknown[] {
        return this._spatialSystem.getBullysInRange(x, y, radius, this.allBullys as any);
    }

    goTick(): void {
        // Rebuild quadtrees at the start of each tick
        this.rebuildQuadTrees();
        // Territory recalculation is handled via markDirty() + requestIdleCallback
        // No need to call recalculate() directly here

        // Clean up dead/removed entities (delegated to EntityManager)
        const { towerRemoved, buildingRemoved } = this._entityManager.cleanupEntities({
            onTowerRemoved: () => { this._renderer.markStaticLayerDirty(); },
            onBuildingRemoved: () => { this._renderer.markStaticLayerDirty(); },
            onBuildingDied: (building) => { this._handleBuildingDied(building as any); },
            onTowerDied: (tower) => { this._handleTowerDied(tower as any); }
        });

        // Add monster flow (delegated to WaveManager)
        this._waveManager.worldAddMonster();

        // Update all entities (delegated to EntityManager)
        this._entityManager.updateEntities();

        // Energy system tick (multiplayer-aware)
        if (this._multiEnergy) {
            this._multiEnergy.goTick();
        } else {
            this.energy.goTick();
        }

        // Fog of war update (multiplayer: only update local player's fog)
        if (this._multiFog) {
            this._multiFog.update();
        } else {
            this.fog.update();
        }

        this.time++;
    }

    /**
     * Add monsters based on world state
     * @delegate WaveManager
     */
    worldAddMonster(): void {
        this._waveManager.worldAddMonster();
    }

    /**
     * Main render method
     * @delegate WorldRenderer
     */
    render(canvasEle?: HTMLCanvasElement): void {
        this._renderer.render(canvasEle);
    }

    /**
     * Mark static layer as dirty
     * @delegate WorldRenderer
     */
    markStaticLayerDirty(): void {
        this._renderer.markStaticLayerDirty();
    }

    markBuildingQuadTreeDirty(): void {
        this._spatialSystem.markBuildingQuadTreeDirty();
    }

    /**
     * Mark UI layer as dirty
     * @delegate WorldRenderer
     */
    markUiDirty(): void {
        this._renderer.markUiDirty();
    }

    // === Backward Compatible Properties (deprecated, now proxied to renderer) ===

    // Cached canvas references (deprecated - use renderer)
    _canvas: HTMLCanvasElement | null = null;
    _ctx: CanvasRenderingContext2D | null = null;

    // Static layer cache (deprecated - use renderer)
    private _staticLayerCanvas: HTMLCanvasElement | null = null;
    private _staticLayerCtx: CanvasRenderingContext2D | null = null;
    private _staticLayerDirty: boolean = true;

    // Preview circles cache (deprecated - use renderer)
    _previewBodyCircle: Circle | null = null;
    _previewRangeCircle: Circle | null = null;
}
