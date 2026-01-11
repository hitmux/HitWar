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
import { Energy } from '../systems/energy/energy';
import { EnergyRenderer } from '../systems/energy/energyRenderer';
import { Mine } from '../systems/energy/mine';
import { FogOfWar } from '../systems/fog';

// Type definitions (local interfaces used by World)
interface UserState {
    money: number;
    putLoc: {
        x: number;
        y: number;
        able: boolean;
        building: { r: number; rangeR: number } | null;
    };
}

interface CheatModeState {
    enabled: boolean;
    priceMultiplier: number;
    infiniteHp: boolean;
    disableEnergy: boolean;
}

// Import entity interfaces from EntityManager
import type {
    TowerLike,
    BuildingLike,
    MonsterLike,
    BullyLike,
    EffectLike
} from './entities';

// Re-export for backward compatibility
export type { TowerLike, BuildingLike, MonsterLike, BullyLike, EffectLike };

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
    rootBuilding: BuildingLike;

    // Territory and energy systems
    territory: Territory;
    energy: Energy;
    energyRenderer: EnergyRenderer;

    // Fog of war system
    fog: FogOfWar;

    // User state
    user: UserState;

    // Cheat mode
    cheatMode: CheatModeState;

    // === Backward Compatible Proxy Properties ===
    // Entity collections (proxied to EntityManager)
    get batterys(): TowerLike[] { return this._entityManager.batterys; }
    get buildings(): BuildingLike[] { return this._entityManager.buildings; }
    get mines(): Set<Mine> { return this._entityManager.mines; }
    get monsters(): Set<MonsterLike> { return this._entityManager.monsters; }
    get effects(): Set<EffectLike> { return this._entityManager.effects; }
    get othersBullys(): BullyLike[] { return this._entityManager.othersBullys; }
    get allBullys(): Set<BullyLike> { return this._entityManager.allBullys; }

    // Spatial indices (proxied to SpatialQuerySystem)
    get buildingQuadTree(): QuadTree | null { return this._spatialSystem.buildingQuadTree; }
    get monsterGrid(): SpatialHashGrid<MonsterLike> | null { return this._spatialSystem.monsterGrid as any; }
    get bullyGrid(): SpatialHashGrid<BullyLike> | null { return this._spatialSystem.bullyGrid as any; }

    // Wave properties (proxied to WaveManager)
    get monsterFlow(): MonsterFlow { return this._waveManager.monsterFlow; }
    get monsterFlowNext(): MonsterFlow { return this._waveManager.monsterFlowNext; }
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

    constructor(worldWidth: number, worldHeight: number, viewWidth?: number, viewHeight?: number) {
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

        // Place root building
        let RootBuilding = BuildingFinallyCompat.Root!(this as any) as any;
        RootBuilding.pos = new Vector(this.width / 2, this.height / 2);
        this.rootBuilding = RootBuilding as BuildingLike;
        this.addBuilding(this.rootBuilding);

        // Territory system (must be created after rootBuilding)
        this.territory = new Territory(this as any);
        // Update EntityManager context with territory
        (this._entityManager as any)._context = { territory: this.territory };

        // Fog of war system (must be created after rootBuilding)
        this.fog = new FogOfWar(this as any);

        // Generate obstacles (must be after rootBuilding)
        this.obstacles = Obstacle.generateRandom(this as any);

        // Generate mines (must be after obstacles)
        this.generateMines();

        // Energy system (must be created after mines)
        this.energy = new Energy(this as any);
        this.energyRenderer = new EnergyRenderer(this as any);

        // Center camera on root building
        this.camera.centerOn(this.rootBuilding.pos);

        this.user = {
            money: 1000,
            putLoc: { x: 0, y: 0, able: false, building: null }
        };

        // 3. Wave Manager (depends on EntityManager and World)
        this._waveManager = new WaveManager(
            { width: this.width, height: this.height, mode: this.mode, get time() { return 0; } },
            {
                addMonster: (m) => this.addMonster(m as MonsterLike),
                addEffect: (e) => this.addEffect(e as EffectLike)
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

        // Initial obstacle cache rebuild
        this._renderer.rebuildObstacleCache();
        this._renderer.markStaticLayerDirty();
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
    addEffect(effect: EffectLike): void {
        this._entityManager.addEffect(effect);
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
        const totalCount = 120 + Math.floor(Math.random() * 11);
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
            onBuildingRemoved: () => { this._renderer.markStaticLayerDirty(); }
        });

        // Add monster flow (delegated to WaveManager)
        this._waveManager.worldAddMonster();

        // Update all entities (delegated to EntityManager)
        this._entityManager.updateEntities();

        // Energy system tick
        this.energy.goTick();

        // Fog of war update
        this.fog.update();
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

    // Obstacle cache (deprecated - use renderer)
    _obstacleCanvas: HTMLCanvasElement | null = null;
    _obstacleCtx: CanvasRenderingContext2D | null = null;
    _obstacleCacheValid: boolean = false;

    // Static layer cache (deprecated - use renderer)
    private _staticLayerCanvas: HTMLCanvasElement | null = null;
    private _staticLayerCtx: CanvasRenderingContext2D | null = null;
    private _staticLayerDirty: boolean = true;

    // UI layer cache (deprecated - use renderer)
    private _uiCanvas: HTMLCanvasElement | null = null;
    private _uiCtx: CanvasRenderingContext2D | null = null;
    private _uiDirty: boolean = true;
    private _uiStateCache: {
        money: number;
        monsterCount: number;
        batteryCount: number;
        nextWave: string;
        wave: number;
        countdown: number;
        zoom: number;
        tps: number;
        fps: number;
        energyProd: number;
        energyCons: number;
    } = {
        money: -1,
        monsterCount: -1,
        batteryCount: -1,
        nextWave: "",
        wave: -1,
        countdown: -1,
        zoom: -1,
        tps: -1,
        fps: -1,
        energyProd: -1,
        energyCons: -1
    };

    // Preview circles cache (deprecated - use renderer)
    _previewBodyCircle: Circle | null = null;
    _previewRangeCircle: Circle | null = null;

    /**
     * Rebuild obstacle offscreen cache
     * @deprecated Use renderer.rebuildObstacleCache() instead
     */
    _rebuildObstacleCache(): void {
        this._renderer.rebuildObstacleCache();
    }
}
