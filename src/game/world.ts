/**
 * World class - Game world management
 * by littlefean
 */

// Core imports
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { Rectangle } from '../core/math/rectangle';
import { Camera } from '../core/camera';
import { QuadTree } from '../core/physics/quadTree';
import { SpatialHashGrid } from '../core/physics/spatialHashGrid';
import { Obstacle } from '../core/physics/obstacle';
import { PR } from '../core/staticInitData';
import { Functions } from '../core/functions';

// Effects imports
import { EffectCircle } from '../effects/effectCircle';
import { EffectLine } from '../effects/effectLine';
import { EffectText } from '../effects/effect';

// Buildings imports
import { BuildingFinallyCompat } from '../buildings/index';

// Monsters imports
import {
    MonsterGroup,
    MonsterFinallyCompat,
    MonsterAllArr,
    MonsterEasyArr,
    Monster10BeforeArr
} from '../monsters/index';
import { getMonstersImg, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../monsters/monsterConstants';
import { Monster } from '../monsters/base/monster';

// Systems imports
import { Territory } from '../systems/territory/territory';
import { Energy } from '../systems/energy/energy';
import { EnergyRenderer } from '../systems/energy/energyRenderer';
import { Mine } from '../systems/energy/mine';
import { Sounds } from '../systems/sound/sounds';
import { FogOfWar } from '../systems/fog';

// Type definitions
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

interface MonsterFlow {
    level: number;
    delayTick: number;
    state: string;
    couldBegin: () => boolean;
    addToWorld: (mode: string) => void;
    copySelf: () => MonsterFlow;
    toString: () => string;
}

interface TowerLike {
    pos: Vector;
    bullys: Set<unknown>;
    isDead: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
}

interface BuildingLike {
    pos: Vector;
    gameType?: string;
    isDead: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    destroy?: (skipRemoveFromBuildings?: boolean) => void;
    getBodyCircle: () => Circle;
}

interface MonsterLike {
    pos: Vector;
    r: number;
    maxHp: number;
    hpInit: (hp: number) => void;
    addPrice: number;
    colishDamage: number;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    _gridCells?: Set<number>;
}

interface BullyLike {
    pos: Vector;
    r: number;
    isOutScreen: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    _gridCells?: Set<number>;
}

interface EffectLike {
    isPlay: boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * 预计算的怪物属性
 */
interface PrecomputedMonsterAttrs {
    hpBonus: number;       // HP 增量
    collideDamageBonus: number;  // 碰撞伤害增量
    priceBonus: number;    // 奖励增量
}

/**
 * 预计算的波次数据
 */
interface PrecomputedWave {
    batchIndex: number;           // 批次索引 (time / monsterAddFreezeTick)
    monsterCount: number;         // 这个批次生成的怪物数量
    monsterTypes: string[];       // 怪物类型名称数组
    attrs: PrecomputedMonsterAttrs; // 共享的属性增量 (同一批次的怪物属性相同)
    isT800Wave: boolean;          // 是否是 T800 特殊波次
    t800Count: number;            // T800 数量 (仅 isT800Wave=true 时有效)
}

export class World {
    // Cached font string to avoid repeated string creation
    static FONT_16 = "16px Microsoft YaHei";

    // World dimensions
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;

    // Camera
    camera: Camera;

    // Entity collections
    batterys: TowerLike[];
    buildings: BuildingLike[];
    mines: Set<Mine>;
    monsters: Set<MonsterLike>;
    effects: Set<EffectLike>;
    othersBullys: BullyLike[];
    allBullys: Set<BullyLike>;

    // Game state
    time: number;
    mode: string;
    haveFlow: boolean;
    monsterAddFreezeTick: number;
    monsterPreAdd: number;
    maxMonsterNum: number;
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

    // Monster flow
    monsterFlow: MonsterFlow;
    monsterFlowNext: MonsterFlow;

    // Cheat mode
    cheatMode: CheatModeState;

    // QuadTrees (kept for buildings only)
    buildingQuadTree: QuadTree | null;

    // Spatial hash grids for moving objects (monsters, bullets)
    monsterGrid: SpatialHashGrid<MonsterLike> | null;
    bullyGrid: SpatialHashGrid<BullyLike> | null;

    // Dirty flags for QuadTree optimization
    private _buildingQuadTreeDirty: boolean = true;

    // Wave precomputation system (non-flow mode)
    private _precomputedWaves: Map<number, PrecomputedWave> = new Map();
    private _precomputeBatchSize: number = 50;   // 每次预计算的批次数
    private _precomputeAheadBatches: number = 20; // 提前预计算的批次数

    // FPS/TPS tracking
    _frameCount: number;
    _fps: number;
    _lastTickCount: number;
    _tps: number;
    _statsUpdateInterval: number;
    _lastStatsUpdate: number;

    // Cached canvas references
    _canvas: HTMLCanvasElement | null = null;
    _ctx: CanvasRenderingContext2D | null = null;

    // Obstacle cache
    _obstacleCanvas: HTMLCanvasElement | null = null;
    _obstacleCtx: CanvasRenderingContext2D | null = null;
    _obstacleCacheValid: boolean = false;

    // Static layer cache (obstacles + static buildings)
    private _staticLayerCanvas: HTMLCanvasElement | null = null;
    private _staticLayerCtx: CanvasRenderingContext2D | null = null;
    private _staticLayerDirty: boolean = true;

    // UI layer cache
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

    // Preview circles cache
    _previewBodyCircle: Circle | null = null;
    _previewRangeCircle: Circle | null = null;

    // Per-frame render caches
    private _visibleBounds: [number, number, number, number] = [0, 0, 0, 0];
    private _monsterRenderList: MonsterLike[] = [];
    private _bulletRenderList: BullyLike[] = [];
    private _visibleMonsters: MonsterLike[] = [];
    private _styleGroupCache: Map<string, any[]> = new Map();
    private _styleGroupKeysUsed: Set<string> = new Set();
    private _bodyCircleCache: WeakMap<any, { circle: Circle; version: number }> = new WeakMap();
    private _dirtyMonsters: Set<MonsterLike> = new Set();
    private _dirtyBullys: Set<BullyLike> = new Set();
    private _gridFullSyncInterval: number = 240;
    private _gridFullSyncCountdown: number = 0;
    private _viewQueryPadding: number = 96;

    constructor(worldWidth: number, worldHeight: number, viewWidth?: number, viewHeight?: number) {
        // World size (game logic space)
        this.width = worldWidth;
        this.height = worldHeight;

        // Viewport size (canvas size)
        this.viewWidth = viewWidth || worldWidth;
        this.viewHeight = viewHeight || worldHeight;

        // Camera
        this.camera = new Camera(this.viewWidth, this.viewHeight, this.width, this.height);

        this.batterys = [];
        this.buildings = [];
        this.mines = new Set();
        this.monsters = new Set();
        this.effects = new Set();
        this.othersBullys = [];
        this.allBullys = new Set();
        this.time = 0;
        this.mode = "normal";
        this._gridFullSyncCountdown = this._gridFullSyncInterval;

        // Obstacles (initialized after rootBuilding)
        this.obstacles = [];

        // Place root building
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
        // Obstacle offscreen cache
        this._rebuildObstacleCache();
        this._staticLayerDirty = true;

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

        // Current monster flow info
        this.monsterFlow = MonsterGroup.getMonsterFlow(this as any, 1, this.mode as any) as unknown as MonsterFlow;
        this.monsterFlowNext = MonsterGroup.getMonsterFlow(this as any, 2, this.mode as any) as unknown as MonsterFlow;
        // Non-flow mode info
        this.haveFlow = true;
        this.monsterAddFreezeTick = 200;
        this.monsterPreAdd = 3;
        this.maxMonsterNum = 250;

        // Game speed multiplier
        this.gameSpeed = 1;

        // Cheat mode settings
        this.cheatMode = {
            enabled: false,
            priceMultiplier: 1.0,
            infiniteHp: false,
            disableEnergy: false
        };

        // Spatial hash grids for moving objects
        this.monsterGrid = new SpatialHashGrid(this.width, this.height, 64);
        this.bullyGrid = new SpatialHashGrid(this.width, this.height, 64);

        // QuadTree for static buildings only
        this.buildingQuadTree = null;

        // FPS and TPS calculation
        this._frameCount = 0;
        this._fps = 0;
        this._lastTickCount = 0;
        this._tps = 0;
        this._statsUpdateInterval = 1000;  // 降低统计更新频率以减少开销
        this._lastStatsUpdate = performance.now();
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
     */
    getAllBuildingArr(): (TowerLike | BuildingLike)[] {
        let res: (TowerLike | BuildingLike)[] = [];
        for (let item of this.buildings) {
            res.push(item);
        }
        for (let item of this.batterys) {
            res.push(item);
        }
        return res;
    }

    /**
     * Get all friendly bullets as array
     * @deprecated Use this.allBullys instead to avoid rebuilding array
     */
    getAllBullyToArr(): BullyLike[] {
        let res: BullyLike[] = [];
        for (let tower of this.batterys) {
            for (let b of tower.bullys) {
                res.push(b as BullyLike);
            }
        }
        for (let b of this.othersBullys) {
            res.push(b);
        }
        return res;
    }

    addTower(battery: TowerLike): void {
        this.batterys.push(battery);
        this._buildingQuadTreeDirty = true;
        // Use incremental update instead of markDirty
        if (this.territory) {
            this.territory.addBuildingIncremental(battery as any);
        }
    }

    /**
     * Add a monster to the world
     */
    addMonster(monster: MonsterLike): void {
        this.monsters.add(monster);
        this._monsterRenderList.push(monster);
        this.monsterGrid?.insert(monster as any);
    }

    /**
     * Remove a monster from the world
     */
    removeMonster(monster: MonsterLike): void {
        if (this.monsters.delete(monster)) {
            const idx = this._monsterRenderList.indexOf(monster);
            if (idx !== -1) {
                this._monsterRenderList.splice(idx, 1);
            }
        }
        this._dirtyMonsters.delete(monster);
        this.monsterGrid?.remove(monster as any);
    }

    addEffect(effect: EffectLike): void {
        this.effects.add(effect);
    }

    /**
     * Add bullet to global cache
     */
    addBully(bully: BullyLike): void {
        this.allBullys.add(bully);
        this.bullyGrid?.insert(bully as any);
    }

    /**
     * Remove bullet from global cache
     */
    removeBully(bully: BullyLike): void {
        this.allBullys.delete(bully);
        this._dirtyBullys.delete(bully);
        this.bullyGrid?.remove(bully as any);
    }

    /**
     * Mark moving spatial object dirty so grid can update lazily
     */
    markSpatialDirty(entity: any): void {
        if (!entity) return;
        if (this.monsters.has(entity as MonsterLike)) {
            this._dirtyMonsters.add(entity as MonsterLike);
        } else if (this.allBullys.has(entity as BullyLike)) {
            this._dirtyBullys.add(entity as BullyLike);
        }
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

    addBuilding(building: BuildingLike): void {
        this.buildings.push(building);
        this._buildingQuadTreeDirty = true;
        this._staticLayerDirty = true;
        // Use incremental update instead of markDirty
        if (this.territory) {
            this.territory.addBuildingIncremental(building as any);
        }
    }

    /**
     * Update spatial indices for collision queries
     */
    rebuildQuadTrees(): void {
        this._syncSpatialGrids();

        // Rebuild building quadtree only when dirty (buildings don't move)
        if (this._buildingQuadTreeDirty) {
            if (this.buildingQuadTree) {
                this.buildingQuadTree.clear();
            } else {
                this.buildingQuadTree = new QuadTree(0, 0, this.width, this.height);
            }
            for (let b of this.buildings) {
                this.buildingQuadTree.insert(b as any);
            }
            for (let t of this.batterys) {
                this.buildingQuadTree.insert(t as any);
            }
            this._buildingQuadTreeDirty = false;
        }
    }

    /**
     * Get monsters near a position using spatial hash grid
     */
    getMonstersInRange(x: number, y: number, radius: number): unknown[] {
        if (this.monsterGrid) {
            return this.monsterGrid.queryRange(x, y, radius);
        }
        return Array.from(this.monsters);
    }

    /**
     * Get buildings near a position using quadtree
     */
    getBuildingsInRange(x: number, y: number, radius: number): unknown[] {
        if (this.buildingQuadTree) {
            return this.buildingQuadTree.retrieveInRange(x, y, radius);
        }
        return this.getAllBuildingArr();
    }

    /**
     * Get bullets in range using spatial hash grid
     */
    getBullysInRange(x: number, y: number, radius: number): unknown[] {
        if (this.bullyGrid) {
            return this.bullyGrid.queryRange(x, y, radius);
        }
        return Array.from(this.allBullys);
    }

    /**
     * Apply incremental spatial grid updates with periodic full calibration
     */
    private _syncSpatialGrids(): void {
        const needFullSync = this._gridFullSyncCountdown <= 0;

        if (this.monsterGrid) {
            if (needFullSync) {
                this.monsterGrid.updateAll(this.monsters as any);
            } else if (this._dirtyMonsters.size) {
                for (const monster of this._dirtyMonsters) {
                    this.monsterGrid.update(monster as any);
                }
            }
        }

        if (this.bullyGrid) {
            if (needFullSync) {
                this.bullyGrid.updateAll(this.allBullys as any);
            } else if (this._dirtyBullys.size) {
                for (const bully of this._dirtyBullys) {
                    this.bullyGrid.update(bully as any);
                }
            }
        }

        // Clear dirty sets after applying updates
        this._dirtyMonsters.clear();
        this._dirtyBullys.clear();

        if (needFullSync) {
            this._gridFullSyncCountdown = this._gridFullSyncInterval;
        } else {
            this._gridFullSyncCountdown--;
        }
    }

    goTick(): void {
        // Rebuild quadtrees at the start of each tick
        this.rebuildQuadTrees();
        // Territory recalculation is handled via markDirty() + requestIdleCallback
        // No need to call recalculate() directly here
        
        // Clear standalone bullets (in-place filter)
        let writeIdx = 0;
        for (let i = 0; i < this.othersBullys.length; i++) {
            const p = this.othersBullys[i];
            if (!p.isOutScreen()) {
                this.othersBullys[writeIdx++] = p;
            } else {
                this.removeBully(p);
            }
        }
        this.othersBullys.length = writeIdx;
        
        // Clear towers (in-place filter)
        let towerRemoved = false;
        writeIdx = 0;
        for (let i = 0; i < this.batterys.length; i++) {
            const t = this.batterys[i];
            if (!t.isDead()) {
                this.batterys[writeIdx++] = t;
            } else {
                towerRemoved = true;
                let e = EffectCircle.acquire(t.pos);
                e.animationFunc = e.destroyAnimation;
                this.addEffect(e as unknown as EffectLike);
            }
        }
        this.batterys.length = writeIdx;
        
        // Clear buildings (in-place filter)
        let buildingRemoved = false;
        writeIdx = 0;
        for (let i = 0; i < this.buildings.length; i++) {
            const b = this.buildings[i];
            if (!b.isDead()) {
                this.buildings[writeIdx++] = b;
            } else {
                buildingRemoved = true;
                if (b.gameType === "Mine" && b.destroy) {
                    b.destroy(true);
                }
            }
        }
        this.buildings.length = writeIdx;
        
        // Mark dirty if tower or building removed
        if (towerRemoved || buildingRemoved) {
            this._buildingQuadTreeDirty = true;
            this._staticLayerDirty = true;
            if (this.territory) {
                this.territory.markDirty();
            }
        }
        // Clear effects and return to object pool
        for (let e of this.effects) {
            if (!e.isPlay) {
                this.effects.delete(e);
                if (e instanceof EffectLine) {
                    EffectLine.release(e);
                } else if (e instanceof EffectCircle) {
                    EffectCircle.release(e as any);
                }
            }
        }
        // Add monster flow
        this.worldAddMonster();
        // Tower actions
        for (let b of this.batterys) {
            b.goStep();
        }
        // Standalone bullet actions
        for (let p of this.othersBullys) {
            p.goStep();
        }
        // Building actions
        for (let b of this.buildings) {
            b.goStep();
        }
        // Mine actions
        for (let m of this.mines) {
            m.goStep();
        }
        // Energy system tick
        this.energy.goTick();
        // Monster actions
        for (let m of this.monsters) {
            m.goStep();
        }
        // Effect steps
        for (let e of this.effects) {
            e.goStep();
        }
        // Fog of war update
        this.fog.update();
        this.time++;
    }

    /**
     * 预计算波次数据 (非 flow 模式)
     * @param startBatch 起始批次索引
     * @param count 预计算的批次数量
     */
    private _precomputeWaves(startBatch: number, count: number): void {
        const choice = (arr: string[]): string => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        for (let i = 0; i < count; i++) {
            const batchIndex = startBatch + i;
            if (this._precomputedWaves.has(batchIndex)) continue;

            const time = batchIndex * this.monsterAddFreezeTick;
            const level = time / 500;

            // 检查是否是 T800 特殊波次
            const isT800Wave = time % 5000 === 0 && time !== 0;

            let wave: PrecomputedWave;

            if (isT800Wave) {
                wave = {
                    batchIndex,
                    monsterCount: 0,
                    monsterTypes: [],
                    attrs: { hpBonus: 0, collideDamageBonus: 0, priceBonus: 0 },
                    isT800Wave: true,
                    t800Count: Functions.levelT800Count(level),
                };
            } else {
                // 计算怪物数量
                let monsterPreAddAdd: number;
                if (this.mode === "easy") {
                    monsterPreAddAdd = Functions.tickAddMonsterNumEasy(time);
                } else {
                    monsterPreAddAdd = Functions.tickAddMonsterNumHard(time);
                }
                const monsterCount = this.monsterPreAdd + monsterPreAddAdd;

                // 确定怪物池
                let monsterPool: string[];
                if (this.mode === "easy") {
                    monsterPool = MonsterEasyArr as unknown as string[];
                } else if (this.mode === "hard" && time < 5000) {
                    monsterPool = Monster10BeforeArr as unknown as string[];
                } else {
                    monsterPool = MonsterAllArr as unknown as string[];
                }

                // 预生成怪物类型
                const monsterTypes: string[] = [];
                for (let j = 0; j < monsterCount; j++) {
                    monsterTypes.push(choice(monsterPool));
                }

                // 计算属性增量 (同一批次共享)
                let attrs: PrecomputedMonsterAttrs;
                if (this.mode === "easy") {
                    attrs = {
                        hpBonus: Functions.tickMonsterHpAddedEasy(time),
                        collideDamageBonus: 0,
                        priceBonus: Functions.levelAddPrice(1 + level),
                    };
                } else if (this.mode === "normal") {
                    attrs = {
                        hpBonus: Functions.levelMonsterHpAddedNormal(level),
                        collideDamageBonus: Functions.levelCollideAdded(level),
                        priceBonus: Functions.levelAddPriceNormal(level),
                    };
                } else {
                    // hard mode
                    attrs = {
                        hpBonus: Functions.tickMonsterHpAddedHard(time),
                        collideDamageBonus: Functions.levelCollideAddedHard(level),
                        priceBonus: Functions.levelAddPriceHard(1 + level),
                    };
                }

                wave = {
                    batchIndex,
                    monsterCount,
                    monsterTypes,
                    attrs,
                    isT800Wave: false,
                    t800Count: 0,
                };
            }

            this._precomputedWaves.set(batchIndex, wave);
        }
    }

    /**
     * 确保有足够的预计算波次数据
     */
    private _ensurePrecomputedWaves(): void {
        if (this.haveFlow) return;

        const currentBatch = Math.floor(this.time / this.monsterAddFreezeTick);
        const targetBatch = currentBatch + this._precomputeAheadBatches;

        // 找到已预计算的最大批次
        let maxPrecomputed = -1;
        for (const key of this._precomputedWaves.keys()) {
            if (key > maxPrecomputed) maxPrecomputed = key;
        }

        // 如果需要更多预计算
        if (maxPrecomputed < targetBatch) {
            const startBatch = maxPrecomputed + 1;
            const count = Math.min(this._precomputeBatchSize, targetBatch - maxPrecomputed);
            this._precomputeWaves(startBatch, count);
        }

        // 清理过时的预计算数据 (保留一些历史数据以防回滚)
        const minKeepBatch = currentBatch - 10;
        for (const key of this._precomputedWaves.keys()) {
            if (key < minKeepBatch) {
                this._precomputedWaves.delete(key);
            }
        }
    }

    /**
     * Add monsters based on world state
     */
    worldAddMonster(): void {
        if (this.haveFlow) {
            // Add monsters via monster flow
            if (this.monsterFlow.couldBegin()) {
                this.monsterFlow.addToWorld(this.mode);

                this.monsterFlow = this.monsterFlowNext.copySelf();
                this.monsterFlowNext = MonsterGroup.getMonsterFlow(
                    this as any,
                    this.monsterFlowNext.level + 1,
                    this.mode as any
                ) as unknown as MonsterFlow;
            }
            if (this.monsterFlow.delayTick === 200 - 1) {
                let et = new EffectText(`第 ${this.monsterFlow.level} 波即将到来！`);
                et.textSize = 40;
                et.duration = 100;
                et.pos = new Vector(this.width / 2, this.height / 2);
                this.addEffect(et as unknown as EffectLike);
                Sounds.playNewMonsterFlow();
            }
        } else {
            // Non-flow mode: 使用预计算的波次数据
            if (this.time % this.monsterAddFreezeTick !== 0) {
                return;
            }

            // 确保有足够的预计算数据
            this._ensurePrecomputedWaves();

            const batchIndex = Math.floor(this.time / this.monsterAddFreezeTick);
            const wave = this._precomputedWaves.get(batchIndex);

            if (!wave) {
                // 如果预计算数据不存在，回退到旧逻辑 (不应发生)
                console.warn(`[World] Missing precomputed wave for batch ${batchIndex}`);
                return;
            }

            if (wave.isT800Wave) {
                // T800 特殊波次
                for (let i = 0; i < wave.t800Count; i++) {
                    let m = MonsterFinallyCompat.T800!(this as any);
                    this.addMonster(m as MonsterLike);
                }
            } else {
                // 普通波次: 使用预计算的怪物类型和属性
                for (const typeName of wave.monsterTypes) {
                    // 使用注册表创建怪物
                    const createFn = (MonsterFinallyCompat as any)[typeName];
                    if (!createFn) continue;

                    const m = createFn(this as any) as MonsterLike;
                    m.hpInit(m.maxHp + wave.attrs.hpBonus);
                    m.colishDamage += wave.attrs.collideDamageBonus;
                    m.addPrice += wave.attrs.priceBonus;
                    this.addMonster(m);
                }
            }
        }
    }

    /**
     * Check if an object is within camera view bounds
     */
    private _isObjectVisible(obj: any, bounds: [number, number, number, number] = this._visibleBounds): boolean {
        const [left, top, right, bottom] = bounds;

        let objLeft: number;
        let objRight: number;
        let objTop: number;
        let objBottom: number;

        if (obj.pos && obj.r !== undefined) {
            objLeft = obj.pos.x - obj.r;
            objRight = obj.pos.x + obj.r;
            objTop = obj.pos.y - obj.r;
            objBottom = obj.pos.y + obj.r;
        } else if (obj.circle && obj.circle.pos && obj.circle.r !== undefined) {
            objLeft = obj.circle.pos.x - obj.circle.r;
            objRight = obj.circle.pos.x + obj.circle.r;
            objTop = obj.circle.pos.y - obj.circle.r;
            objBottom = obj.circle.pos.y + obj.circle.r;
        } else if (obj.line && obj.line.x1 !== undefined && obj.line.y1 !== undefined && obj.line.x2 !== undefined && obj.line.y2 !== undefined) {
            const stroke = obj.line.strokeWidth || 0;
            objLeft = Math.min(obj.line.x1, obj.line.x2) - stroke;
            objRight = Math.max(obj.line.x1, obj.line.x2) + stroke;
            objTop = Math.min(obj.line.y1, obj.line.y2) - stroke;
            objBottom = Math.max(obj.line.y1, obj.line.y2) + stroke;
        } else {
            // Unknown object type defaults to invisible; renderers must provide bounds explicitly
            return false;
        }

        return objRight >= left && objLeft <= right &&
               objBottom >= top && objTop <= bottom;
    }

    private _getViewQueryCircle(): { cx: number; cy: number; radius: number } {
        const viewWorldWidth = this.viewWidth / this.camera.zoom;
        const viewWorldHeight = this.viewHeight / this.camera.zoom;
        const cx = this.camera.x + viewWorldWidth / 2;
        const cy = this.camera.y + viewWorldHeight / 2;
        const radius = Math.hypot(viewWorldWidth, viewWorldHeight) * 0.5 + this._viewQueryPadding;
        return { cx, cy, radius };
    }

    private _syncMonsterRenderListFromSet(): MonsterLike[] {
        this._monsterRenderList.length = 0;
        for (const monster of this.monsters) {
            this._monsterRenderList.push(monster);
        }
        return this._monsterRenderList;
    }

    private _syncBulletRenderListFromSet(): BullyLike[] {
        this._bulletRenderList.length = 0;
        for (const bully of this.allBullys) {
            this._bulletRenderList.push(bully);
        }
        return this._bulletRenderList;
    }

    render(canvasEle?: HTMLCanvasElement): void {
        // Cache canvas and context
        if (!this._canvas) {
            this._canvas = canvasEle || document.querySelector("canvas");
            this._ctx = this._canvas!.getContext("2d");
        }
        let ctx = this._ctx!;

        // Update visible bounds and frame caches
        this._updateVisibleBounds();
        this._resetRenderFrameCaches();
        this._ensureStaticLayerCache();

        // Clear entire canvas
        ctx.clearRect(0, 0, this.viewWidth * PR, this.viewHeight * PR);

        // Apply camera transform
        this.camera.applyTransform(ctx);

        // Render static layer (obstacles + static buildings) once per invalidation
        if (this._staticLayerCanvas) {
            ctx.drawImage(this._staticLayerCanvas, 0, 0);
        }

        // Render territory
        if (this.territory) {
            this.territory.renderer.render(ctx);
        }

        // Render game objects (with view culling)
        for (let b of this.batterys) {
            if (this._isObjectVisible(b, this._visibleBounds)) {
                b.render(ctx);
            }
        }

        for (let m of this.mines) {
            if (this._isObjectVisible(m, this._visibleBounds)) {
                m.render(ctx);
            }
        }

        const viewQuery = this._getViewQueryCircle();
        const monsterCandidates = this.monsterGrid
            ? (this.monsterGrid.queryRange(viewQuery.cx, viewQuery.cy, viewQuery.radius) as MonsterLike[])
            : this._syncMonsterRenderListFromSet();
        const bulletCandidates = this.bullyGrid
            ? (this.bullyGrid.queryRange(viewQuery.cx, viewQuery.cy, viewQuery.radius) as BullyLike[])
            : this._syncBulletRenderListFromSet();
        this._bulletRenderList = bulletCandidates;

        // Collect visible monsters and bullets into shared style groups
        for (const monster of monsterCandidates) {
            if (this._isObjectVisible(monster, this._visibleBounds)) {
                this._addEntityToStyleGroup(monster);
                this._visibleMonsters.push(monster);
            }
        }
        for (let i = 0; i < bulletCandidates.length; i++) {
            const bully = bulletCandidates[i];
            if (this._isObjectVisible(bully, this._visibleBounds)) {
                this._addEntityToStyleGroup(bully);
            }
        }

        // Batch render base circles for monsters and bullets together
        this._renderEntitiesBatch(ctx);

        // Render additional components for visible monsters (HP bars, text)
        for (const monster of this._visibleMonsters) {
            this._renderMonsterAdditionalComponents(monster, ctx);
        }
        this._visibleMonsters.length = 0;

        for (let e of this.effects) {
            if (this._isObjectVisible(e, this._visibleBounds)) {
                e.render(ctx);
            }
        }

        // Render fog of war (after effects, before preview)
        this.fog.renderer.render(ctx, this.width, this.height);

        // Render placement preview
        if (this.user.putLoc.building !== null && this.user.putLoc.building !== undefined) {
            let x = this.user.putLoc.x;
            let y = this.user.putLoc.y;

            if (!this._previewBodyCircle) {
                this._previewBodyCircle = new Circle(x, y, this.user.putLoc.building.r);
            } else {
                this._previewBodyCircle.x = x;
                this._previewBodyCircle.y = y;
                this._previewBodyCircle.r = this.user.putLoc.building.r;
            }
            this._previewBodyCircle.renderView(ctx);

            if (!this._previewRangeCircle) {
                this._previewRangeCircle = new Circle(x, y, this.user.putLoc.building.rangeR);
            } else {
                this._previewRangeCircle.x = x;
                this._previewRangeCircle.y = y;
                this._previewRangeCircle.r = this.user.putLoc.building.rangeR;
            }
            this._previewRangeCircle.renderView(ctx);
        }

        // Reset camera transform
        this.camera.resetTransform(ctx);

        // Calculate FPS and TPS
        this._frameCount++;
        const now = performance.now();
        if (now - this._lastStatsUpdate >= this._statsUpdateInterval) {
            const elapsed = now - this._lastStatsUpdate;
            this._fps = Math.round(this._frameCount * 1000 / elapsed);
            this._tps = Math.round((this.time - this._lastTickCount) * 1000 / elapsed);
            this._frameCount = 0;
            this._lastTickCount = this.time;
            this._lastStatsUpdate = now;
        }

        // UI layer (fixed on screen) with dirty flag
        this._updateUiState();
        if (this._uiDirty) {
            this._renderUiLayer();
        }
        if (this._uiCanvas) {
            ctx.drawImage(this._uiCanvas, 0, 0);
        }

        // Energy shortage screen edge flashing
        ctx.save();
        ctx.scale(PR, PR);
        this.energyRenderer.render(ctx);
        ctx.restore();
    }

    /**
     * Rebuild obstacle offscreen cache
     */
    _rebuildObstacleCache(): void {
        if (!this._obstacleCanvas) {
            this._obstacleCanvas = document.createElement('canvas');
            this._obstacleCtx = this._obstacleCanvas.getContext('2d');
        }

        this._obstacleCanvas.width = this.width;
        this._obstacleCanvas.height = this.height;

        const ctx = this._obstacleCtx!;
        ctx.clearRect(0, 0, this.width, this.height);

        for (let obs of this.obstacles) {
            ctx.beginPath();
            ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
            ctx.fillStyle = obs.color;
            ctx.fill();
            ctx.strokeStyle = obs.borderColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }

        this._obstacleCacheValid = true;
    }

    /**
     * Batch render entities with the same style to reduce Canvas API calls
     */
    private _renderEntitiesBatch(ctx: CanvasRenderingContext2D): void {
        for (const groupEntities of this._styleGroupCache.values()) {
            if (groupEntities.length === 0) continue;

            const firstCircle = this._getBodyCircleCached(groupEntities[0]);
            if (!firstCircle) {
                groupEntities.length = 0;
                continue;
            }

            ctx.fillStyle = firstCircle.fillColor.toStringRGBA();
            ctx.strokeStyle = firstCircle.strokeColor.toStringRGBA();
            ctx.lineWidth = firstCircle.strokeWidth;

            ctx.beginPath();
            for (const entity of groupEntities) {
                const circle = this._getBodyCircleCached(entity);
                if (!circle) continue;
                circle.renderPath(ctx);
            }
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            groupEntities.length = 0;
        }
    }

    /**
     * Render additional components for monsters (HP bars, text) after batch circle rendering
     * @param monster - Monster entity to render additional components for
     * @param ctx - Canvas rendering context
     */
    private _renderMonsterAdditionalComponents(monster: any, ctx: CanvasRenderingContext2D): void {
        // This mimics the additional rendering logic from CircleObject.render()
        // but skips the circle rendering since that's already done in batch

        // Render monster sprite image (overlays the batch-rendered circle)
        const MONSTERS_IMG = getMonstersImg();
        if (MONSTERS_IMG && MONSTERS_IMG.complete && MONSTERS_IMG.naturalWidth > 0) {
            const imgIndex = monster.imgIndex ?? 0;
            const gridWidth = Monster._gridWidth || Math.floor(MONSTERS_IMG.naturalWidth / MONSTER_IMG_PRE_WIDTH);
            const x = imgIndex % gridWidth;
            const y = Math.floor(imgIndex / gridWidth);
            const srcX = x * MONSTER_IMG_PRE_WIDTH;
            const srcY = y * MONSTER_IMG_PRE_HEIGHT;
            
            ctx.drawImage(
                MONSTERS_IMG,
                srcX,
                srcY,
                MONSTER_IMG_PRE_WIDTH,
                MONSTER_IMG_PRE_HEIGHT,
                monster.pos.x - monster.r,
                monster.pos.y - monster.r,
                monster.r * 2,
                monster.r * 2
            );
        }

        let hpRate = monster.hp / monster.maxHp;

        if (monster.maxHp > 0) {
            if (!monster.isDead()) {
                let barH = monster.hpBarHeight;
                let barX = monster.pos.x - monster.r;
                let barY = monster.pos.y - monster.r - 2.5 * barH;
                let barW = monster.r * 2;

                if (!monster._hpBarBorder) {
                    monster._hpBarBorder = new Rectangle(barX, barY, barW, barH);
                    monster._hpBarBorder.setStrokeWidth(1);
                    monster._hpBarBorder.setFillColor(0, 0, 0, 0);
                    monster._hpBarBorder.setStrokeColor(1, 1, 1);
                } else {
                    monster._hpBarBorder.pos.x = barX;
                    monster._hpBarBorder.pos.y = barY;
                    monster._hpBarBorder.width = barW;
                    monster._hpBarBorder.height = barH;
                }
                monster._hpBarBorder.render(ctx);

                if (!monster._hpBarFill) {
                    monster._hpBarFill = new Rectangle(barX, barY, barW * hpRate, barH);
                    monster._hpBarFill.setStrokeWidth(0);
                    monster._hpBarFill.setFillColor(monster.hpColor.r, monster.hpColor.g, monster.hpColor.b, monster.hpColor.a);
                } else {
                    monster._hpBarFill.pos.x = barX;
                    monster._hpBarFill.pos.y = barY;
                    monster._hpBarFill.width = barW * hpRate;
                    monster._hpBarFill.height = barH;
                    monster._hpBarFill.setFillColor(monster.hpColor.r, monster.hpColor.g, monster.hpColor.b, monster.hpColor.a);
                }
                monster._hpBarFill.render(ctx);

                let hpInt = Math.floor(monster.hp);
                if (hpInt !== monster._lastHpInt) {
                    monster._lastHpInt = hpInt;
                    monster._hpStr = hpInt.toString();
                }
                ctx.fillStyle = "black";
                ctx.font = "9px Arial"; // Using hardcoded font since CircleObject.FONT_9 may not be accessible
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(monster._hpStr, monster.pos.x, barY + 1);
            }
        }
    }

    private _updateVisibleBounds(): void {
        const viewWorldWidth = this.viewWidth / this.camera.zoom;
        const viewWorldHeight = this.viewHeight / this.camera.zoom;

        this._visibleBounds[0] = this.camera.x;
        this._visibleBounds[1] = this.camera.y;
        this._visibleBounds[2] = this.camera.x + viewWorldWidth;
        this._visibleBounds[3] = this.camera.y + viewWorldHeight;
    }

    private _resetRenderFrameCaches(): void {
        this._visibleMonsters.length = 0;
        for (const key of this._styleGroupKeysUsed) {
            const group = this._styleGroupCache.get(key);
            if (group) {
                group.length = 0;
            }
        }
        this._styleGroupKeysUsed.clear();
    }

    markStaticLayerDirty(): void {
        this._staticLayerDirty = true;
    }

    markUiDirty(): void {
        this._uiDirty = true;
    }

    private _ensureStaticLayerCache(): void {
        if (!this._staticLayerCanvas) {
            this._staticLayerCanvas = document.createElement('canvas');
            this._staticLayerCtx = this._staticLayerCanvas.getContext('2d');
            this._staticLayerDirty = true;
        }
        if (!this._staticLayerCanvas || !this._staticLayerCtx) {
            return;
        }

        if (this._staticLayerCanvas.width !== this.width || this._staticLayerCanvas.height !== this.height) {
            this._staticLayerCanvas.width = this.width;
            this._staticLayerCanvas.height = this.height;
            this._staticLayerDirty = true;
        }

        if (!this._obstacleCacheValid) {
            this._rebuildObstacleCache();
        }

        if (this._staticLayerDirty) {
            this._rebuildStaticLayerCache();
        }
    }

    private _rebuildStaticLayerCache(): void {
        if (!this._staticLayerCanvas || !this._staticLayerCtx) {
            return;
        }
        const ctx = this._staticLayerCtx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (this._obstacleCanvas && this._obstacleCacheValid) {
            ctx.drawImage(this._obstacleCanvas, 0, 0);
        } else {
            for (let obs of this.obstacles) {
                ctx.beginPath();
                ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
                ctx.fillStyle = obs.color;
                ctx.fill();
                ctx.strokeStyle = obs.borderColor;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            }
        }

        for (let b of this.buildings) {
            if ((b as any).gameType === "Mine") continue;
            b.render(ctx);
        }

        this._staticLayerDirty = false;
    }

    private _ensureUiCanvas(): void {
        if (!this._uiCanvas) {
            this._uiCanvas = document.createElement("canvas");
            this._uiCtx = this._uiCanvas.getContext("2d");
            this._uiDirty = true;
        }
        if (!this._uiCanvas || !this._uiCtx) {
            return;
        }
        const targetWidth = this.viewWidth * PR;
        const targetHeight = this.viewHeight * PR;
        if (this._uiCanvas.width !== targetWidth || this._uiCanvas.height !== targetHeight) {
            this._uiCanvas.width = targetWidth;
            this._uiCanvas.height = targetHeight;
            this._uiDirty = true;
        }
    }

    private _updateUiState(): void {
        const nextState = {
            money: this.user.money,
            monsterCount: this.monsters.size,
            batteryCount: this.batterys.length,
            nextWave: this.monsterFlow.toString(),
            wave: this.monsterFlow.level - 1,
            countdown: this.monsterFlow.delayTick,
            zoom: Math.round(this.camera.zoom * 100),
            tps: this._tps,
            fps: this._fps,
            energyProd: this.energy.getTotalProduction(),
            energyCons: this.energy.getTotalConsumption()
        };

        let changed = false;
        for (const key of Object.keys(nextState) as (keyof typeof nextState)[]) {
            const nextValue = nextState[key];
            if ((this._uiStateCache as any)[key] !== nextValue) {
                (this._uiStateCache as any)[key] = nextValue;
                changed = true;
            }
        }
        if (changed) {
            this._uiDirty = true;
        }
    }

    private _renderUiLayer(): void {
        this._ensureUiCanvas();
        if (!this._uiCanvas || !this._uiCtx) {
            return;
        }
        const ctx = this._uiCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this._uiCanvas.width, this._uiCanvas.height);
        ctx.save();
        ctx.scale(PR, PR);

        ctx.font = World.FONT_16;
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.fillText("金钱：" + this._uiStateCache.money.toString(), 20, 20);
        ctx.fillText("怪物数量：" + this._uiStateCache.monsterCount, 20, 40);
        ctx.fillText("炮塔数量：" + this._uiStateCache.batteryCount, 20, 60);
        ctx.fillText("下一波：" + this._uiStateCache.nextWave, 20, 80);
        ctx.fillText("当前波数：" + this._uiStateCache.wave, 20, 100);
        ctx.fillText("倒计时：" + this._uiStateCache.countdown, 20, 120);
        ctx.fillText("缩放：" + this._uiStateCache.zoom + "%", 20, 140);
        ctx.fillText("TPS：" + this._uiStateCache.tps, 20, 160);
        ctx.fillText("FPS：" + this._uiStateCache.fps, 20, 180);

        ctx.fillStyle = this._uiStateCache.energyProd >= this._uiStateCache.energyCons ? "green" : "red";
        ctx.fillText("能源：" + this._uiStateCache.energyCons + "/" + this._uiStateCache.energyProd, 20, 200);
        ctx.restore();
        this._uiDirty = false;
    }

    private _addEntityToStyleGroup(entity: any): void {
        const bodyCircle = this._getBodyCircleCached(entity);
        if (!bodyCircle) return;

        const styleKey = bodyCircle.getStyleKey();
        let group = this._styleGroupCache.get(styleKey);
        if (!group) {
            group = [];
            this._styleGroupCache.set(styleKey, group);
        }
        group.push(entity);
        this._styleGroupKeysUsed.add(styleKey);
    }

    private _getBodyCircleCached(entity: any): Circle | null {
        if (!entity || typeof entity.getBodyCircle !== "function") {
            return null;
        }
        const cached = this._bodyCircleCache.get(entity);
        const version = this._getBodyVersion(entity);

        if (!cached || cached.version !== version) {
            const fresh = entity.getBodyCircle();
            if (!fresh) {
                return null;
            }
            this._bodyCircleCache.set(entity, { circle: fresh, version });
            return fresh;
        }

        this._syncCircleTransform(cached.circle, entity);
        return cached.circle;
    }

    private _getBodyVersion(entity: any): number {
        const v = (entity as any)._bodyVersion;
        return typeof v === "number" ? v : 0;
    }

    private _syncCircleTransform(circle: Circle, entity: any): void {
        if (entity.pos && entity.r !== undefined) {
            circle.x = entity.pos.x;
            circle.y = entity.pos.y;
            circle.r = entity.r;
            circle.pos.x = entity.pos.x;
            circle.pos.y = entity.pos.y;
        } else if (entity.circle && entity.circle.pos && entity.circle.r !== undefined) {
            circle.x = entity.circle.pos.x;
            circle.y = entity.circle.pos.y;
            circle.r = entity.circle.r;
            circle.pos.x = entity.circle.pos.x;
            circle.pos.y = entity.circle.pos.y;
        }
    }
}
