/**
 * WorldRenderer - 世界渲染器
 * 负责游戏世界的所有渲染逻辑
 */

import { Circle } from '../../core/math/circle';
import { Camera } from '../../core/camera';
import { Obstacle } from '../../core/physics/obstacle';
import { SpatialHashGrid } from '../../core/physics/spatialHashGrid';
import { PR } from '../../core/staticInitData';
import { renderStatusBar, BAR_OFFSET, type StatusBarCache } from '../../entities/statusBar';

// Monsters imports
import { getMonstersImg, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../../monsters/monsterConstants';
import { Monster } from '../../monsters/base/monster';

// Types
import type { TowerLike, BuildingLike, MonsterLike, BullyLike, IEffect } from '../entities';
import type { Mine } from '../../systems/energy/mine';

/** Buffer expansion ratio: Canvas covers 1.5x viewport area to reduce rebuild frequency */
const BUFFER_RATIO = 1.5;

// === 渲染器需要的上下文接口 ===

/**
 * 渲染器需要的 World 上下文
 */
export interface WorldRendererContext {
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;
    camera: Camera;
    time: number;

    // Entity collections (只读)
    batterys: TowerLike[];
    buildings: BuildingLike[];
    mines: Set<Mine>;
    monsters: Set<MonsterLike>;
    effects: Set<IEffect>;
    allBullys: Set<BullyLike>;
    obstacles: Obstacle[];

    // Spatial grids (只读)
    monsterGrid: SpatialHashGrid<MonsterLike> | null;
    bullyGrid: SpatialHashGrid<BullyLike> | null;

    // User state
    user: {
        money: number;
        putLoc: {
            x: number;
            y: number;
            able: boolean;
            building: { r: number; rangeR: number } | null;
        };
        /** 移动模式下选中的建筑位置和半径 */
        moveTarget: { x: number; y: number; r: number } | null;
    };

    // Systems
    territory?: { renderer: { render: (ctx: CanvasRenderingContext2D) => void } };
    fog?: {
        enabled: boolean;
        renderer: { render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void };
        isCircleVisible: (x: number, y: number, radius: number) => boolean;
    };
    energy?: { getTotalProduction: () => number; getTotalConsumption: () => number };
    energyRenderer?: { render: (ctx: CanvasRenderingContext2D) => void };
    monsterFlow?: { toString: () => string; level: number; delayTick: number };

    // Methods
    syncMonsterRenderListFromSet?: () => MonsterLike[];
}

/**
 * UI 状态缓存
 */
interface UiStateCache {
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
}

/**
 * WorldRenderer - 世界渲染器
 */
export class WorldRenderer {
    // Cached font string to avoid repeated string creation
    static readonly FONT_16 = "16px Microsoft YaHei";

    // Context reference
    private readonly _context: WorldRendererContext;

    // FPS/TPS tracking
    private _frameCount: number = 0;
    private _fps: number = 0;
    private _lastTickCount: number = 0;
    private _tps: number = 0;
    private _statsUpdateInterval: number = 1000;
    private _lastStatsUpdate: number = performance.now();

    // Cached canvas references
    private _canvas: HTMLCanvasElement | null = null;
    private _ctx: CanvasRenderingContext2D | null = null;

    // Static layer cache (obstacles + static buildings)
    private _staticLayerCanvas: HTMLCanvasElement | null = null;
    private _staticLayerCtx: CanvasRenderingContext2D | null = null;
    private _staticLayerDirty: boolean = true;

    // Static layer buffer tracking (viewport-level caching)
    private _lastCameraX = 0;
    private _lastCameraY = 0;
    private _lastZoom = 1;
    private _bufferLeft = 0;        // Buffer world area left boundary
    private _bufferTop = 0;         // Buffer world area top boundary
    private _bufferWorldWidth = 0;  // Buffer world width
    private _bufferWorldHeight = 0; // Buffer world height
    private _canvasWidth = 0;       // Canvas logical width
    private _canvasHeight = 0;      // Canvas logical height

    // UI layer state cache (dirty flag detects state changes)
    private _uiDirty: boolean = true;
    private _uiStateCache: UiStateCache = {
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
    private _previewBodyCircle: Circle | null = null;
    private _previewRangeCircle: Circle | null = null;
    private _previewRepairCircle: Circle | null = null;  // 维修塔的维修半径圆圈
    private _moveRangeCircle: Circle | null = null;

    // Per-frame render caches
    private _visibleBounds: [number, number, number, number] = [0, 0, 0, 0];
    private _bulletRenderList: BullyLike[] = [];
    private _visibleMonsters: MonsterLike[] = [];
    private _styleGroupCache: Map<string, any[]> = new Map();
    private _styleGroupKeysUsed: Set<string> = new Set();
    private _bodyCircleCache: WeakMap<any, { circle: Circle; version: number }> = new WeakMap();
    private _viewQueryPadding: number = 96;

    constructor(context: WorldRendererContext) {
        this._context = context;
    }

    // === Public Properties ===

    get fps(): number { return this._fps; }
    get tps(): number { return this._tps; }

    // === Public Methods ===

    /**
     * Mark static layer as dirty, needs rebuild
     */
    markStaticLayerDirty(): void {
        this._staticLayerDirty = true;
    }

    /**
     * Mark UI layer as dirty, needs rebuild
     */
    markUiDirty(): void {
        this._uiDirty = true;
    }

    /**
     * Main render method
     */
    render(canvasEle?: HTMLCanvasElement): void {
        // Cache canvas and context
        if (!this._canvas) {
            this._canvas = canvasEle || document.querySelector("canvas");
            this._ctx = this._canvas!.getContext("2d");
        }
        const ctx = this._ctx!;
        const { camera, viewWidth, viewHeight } = this._context;

        // Update visible bounds and frame caches
        this._updateVisibleBounds();
        this._resetRenderFrameCaches();
        this._ensureStaticLayerCache();

        // Clear entire canvas
        ctx.clearRect(0, 0, viewWidth * PR, viewHeight * PR);

        // Apply camera transform
        camera.applyTransform(ctx);

        // Render static layer (obstacles + static buildings) once per invalidation
        if (this._staticLayerCanvas) {
            // 9-parameter form: source region → target region
            ctx.drawImage(
                this._staticLayerCanvas,
                0, 0, this._canvasWidth * PR, this._canvasHeight * PR,  // Source: entire canvas (pixel size)
                this._bufferLeft, this._bufferTop,
                this._bufferWorldWidth, this._bufferWorldHeight  // Target: world coordinates
            );
        }

        // Render territory
        if (this._context.territory) {
            this._context.territory.renderer.render(ctx);
        }

        // Render dynamic parts of buildings (HP bars)
        for (const b of this._context.buildings) {
            if ((b as any).gameType === "Mine") continue;
            if (this._isObjectVisible(b, this._visibleBounds)) {
                if (typeof (b as any).renderDynamic === 'function') {
                    (b as any).renderDynamic(ctx);
                }
            }
        }

        // Render game objects (with view culling)
        // 阶段1: 先渲染所有塔的主体
        for (const b of this._context.batterys) {
            if (this._isObjectVisible(b, this._visibleBounds)) {
                (b as any).renderBody(ctx);
            }
        }
        // 阶段2: 再渲染所有塔的状态条（血条、蓄力条等）
        // 这样状态条都在同一层级，避免塔A的蓄力条覆盖塔B的血条
        for (const b of this._context.batterys) {
            if (this._isObjectVisible(b, this._visibleBounds)) {
                (b as any).renderBars(ctx);
            }
        }

        for (const m of this._context.mines) {
            if (this._isObjectVisible(m, this._visibleBounds)) {
                m.render(ctx);
            }
        }

        const viewQuery = this._getViewQueryCircle();
        const monsterCandidates = this._context.monsterGrid
            ? (this._context.monsterGrid.queryRange(viewQuery.cx, viewQuery.cy, viewQuery.radius) as MonsterLike[])
            : this._syncMonsterRenderListFromSet();
        const bulletCandidates = this._context.bullyGrid
            ? (this._context.bullyGrid.queryRange(viewQuery.cx, viewQuery.cy, viewQuery.radius) as BullyLike[])
            : this._syncBulletRenderListFromSet();
        this._bulletRenderList = bulletCandidates;

        // Collect visible monsters and bullets into shared style groups
        // Skip entities fully covered by fog (100% opaque fog area)
        const fog = this._context.fog;
        const fogEnabled = fog?.enabled ?? false;
        for (const monster of monsterCandidates) {
            if (this._isObjectVisible(monster, this._visibleBounds)) {
                // Skip rendering if fully covered by fog
                if (fogEnabled && !fog!.isCircleVisible(monster.pos.x, monster.pos.y, monster.r)) {
                    continue;
                }
                this._addEntityToStyleGroup(monster);
                this._visibleMonsters.push(monster);
            }
        }
        for (let i = 0; i < bulletCandidates.length; i++) {
            const bully = bulletCandidates[i];
            if (this._isObjectVisible(bully, this._visibleBounds)) {
                // Skip rendering if fully covered by fog
                if (fogEnabled && !fog!.isCircleVisible(bully.pos.x, bully.pos.y, bully.r)) {
                    continue;
                }
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

        for (const e of this._context.effects) {
            if (this._isObjectVisible(e, this._visibleBounds)) {
                e.render(ctx);
            }
        }

        // Render fog of war (after effects, before preview)
        if (this._context.fog) {
            this._context.fog.renderer.render(ctx, this._context.width, this._context.height);
        }

        // Render placement preview
        this._renderPlacementPreview(ctx);

        // Render move range preview (选中建筑时显示75px移动范围圈)
        this._renderMoveRangePreview(ctx);

        // Reset camera transform
        camera.resetTransform(ctx);

        // Calculate FPS and TPS
        this._updateFpsTps();

        // UI layer (fixed on screen) - direct render without offscreen canvas
        this._updateUiState();
        this._renderUiLayer(ctx);

        // Energy shortage screen edge flashing
        if (this._context.energyRenderer) {
            ctx.save();
            ctx.scale(PR, PR);
            this._context.energyRenderer.render(ctx);
            ctx.restore();
        }
    }

    // === Private Methods ===

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
        const { camera, viewWidth, viewHeight } = this._context;
        const viewWorldWidth = viewWidth / camera.zoom;
        const viewWorldHeight = viewHeight / camera.zoom;
        const cx = camera.x + viewWorldWidth / 2;
        const cy = camera.y + viewWorldHeight / 2;
        const radius = Math.hypot(viewWorldWidth, viewWorldHeight) * 0.5 + this._viewQueryPadding;
        return { cx, cy, radius };
    }

    private _syncMonsterRenderListFromSet(): MonsterLike[] {
        if (this._context.syncMonsterRenderListFromSet) {
            return this._context.syncMonsterRenderListFromSet();
        }
        // Fallback: convert set to array
        return Array.from(this._context.monsters);
    }

    private _syncBulletRenderListFromSet(): BullyLike[] {
        this._bulletRenderList.length = 0;
        for (const bully of this._context.allBullys) {
            this._bulletRenderList.push(bully);
        }
        return this._bulletRenderList;
    }

    private _updateVisibleBounds(): void {
        const { camera, viewWidth, viewHeight } = this._context;
        const viewWorldWidth = viewWidth / camera.zoom;
        const viewWorldHeight = viewHeight / camera.zoom;

        this._visibleBounds[0] = camera.x;
        this._visibleBounds[1] = camera.y;
        this._visibleBounds[2] = camera.x + viewWorldWidth;
        this._visibleBounds[3] = camera.y + viewWorldHeight;
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


    /**
     * Check if static layer rebuild is needed due to camera movement or zoom change
     */
    private _shouldRebuildForCamera(camera: Camera): boolean {
        // Zoom shrink detection: must rebuild when zooming out
        if (camera.zoom < this._lastZoom * 0.9) {
            return true;
        }

        // Position change detection
        const viewWorldWidth = camera.viewWidth / camera.zoom;
        const viewWorldHeight = camera.viewHeight / camera.zoom;
        const thresholdX = viewWorldWidth * 0.25;
        const thresholdY = viewWorldHeight * 0.25;

        const dx = Math.abs(camera.x - this._lastCameraX);
        const dy = Math.abs(camera.y - this._lastCameraY);

        return dx > thresholdX || dy > thresholdY;
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

        const { viewWidth, viewHeight, camera } = this._context;
        const pr = PR;
        // Viewport-level buffer size (logical size)
        const targetWidth = viewWidth * BUFFER_RATIO;
        const targetHeight = viewHeight * BUFFER_RATIO;
        // Canvas pixel size = logical size × PR
        const targetPixelWidth = targetWidth * pr;
        const targetPixelHeight = targetHeight * pr;

        if (this._staticLayerCanvas.width !== targetPixelWidth || this._staticLayerCanvas.height !== targetPixelHeight) {
            this._staticLayerCanvas.width = targetPixelWidth;
            this._staticLayerCanvas.height = targetPixelHeight;
            this._canvasWidth = targetWidth;
            this._canvasHeight = targetHeight;
            this._staticLayerDirty = true;
        }

        // Check camera movement or zoom
        if (this._shouldRebuildForCamera(camera)) {
            this._staticLayerDirty = true;
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
        const { width: worldWidth, height: worldHeight, obstacles, buildings, camera } = this._context;
        const pr = PR;

        // Calculate viewport world size (affected by zoom)
        const viewWorldWidth = camera.viewWidth / camera.zoom;
        const viewWorldHeight = camera.viewHeight / camera.zoom;

        // Buffer world range
        this._bufferWorldWidth = viewWorldWidth * BUFFER_RATIO;
        this._bufferWorldHeight = viewWorldHeight * BUFFER_RATIO;

        // Calculate camera center (world coordinates)
        // Note: camera.x, camera.y is viewport top-left, not center!
        const cameraCenterX = camera.x + viewWorldWidth / 2;
        const cameraCenterY = camera.y + viewWorldHeight / 2;

        // Buffer world area boundaries (with world boundary clipping)
        this._bufferLeft = Math.max(0, cameraCenterX - this._bufferWorldWidth / 2);
        this._bufferTop = Math.max(0, cameraCenterY - this._bufferWorldHeight / 2);
        const bufferRight = Math.min(worldWidth, this._bufferLeft + this._bufferWorldWidth);
        const bufferBottom = Math.min(worldHeight, this._bufferTop + this._bufferWorldHeight);

        // Update world size based on actual clipping
        this._bufferWorldWidth = bufferRight - this._bufferLeft;
        this._bufferWorldHeight = bufferBottom - this._bufferTop;

        // Coordinate transform: map world coordinates to canvas pixels (with PR)
        const scaleX = (this._canvasWidth * pr) / this._bufferWorldWidth;
        const scaleY = (this._canvasHeight * pr) / this._bufferWorldHeight;
        ctx.setTransform(scaleX, 0, 0, scaleY, -this._bufferLeft * scaleX, -this._bufferTop * scaleY);

        ctx.clearRect(this._bufferLeft, this._bufferTop, this._bufferWorldWidth, this._bufferWorldHeight);

        // Render obstacles within buffer
        for (const obs of obstacles) {
            // Skip obstacles outside buffer
            if (obs.pos.x + obs.radius < this._bufferLeft || obs.pos.x - obs.radius > bufferRight ||
                obs.pos.y + obs.radius < this._bufferTop || obs.pos.y - obs.radius > bufferBottom) {
                continue;
            }
            ctx.beginPath();
            ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
            ctx.fillStyle = obs.color;
            ctx.fill();
            ctx.strokeStyle = obs.borderColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }

        // Only render static parts of buildings (body, not HP bar) within buffer
        for (const b of buildings) {
            if ((b as any).gameType === "Mine") continue;
            const pos = (b as any).pos;
            const r = (b as any).r || 50;
            // Skip buildings outside buffer
            if (pos.x + r < this._bufferLeft || pos.x - r > bufferRight ||
                pos.y + r < this._bufferTop || pos.y - r > bufferBottom) {
                continue;
            }
            if (typeof (b as any).renderStatic === 'function') {
                (b as any).renderStatic(ctx);
            } else {
                b.render(ctx);
            }
        }

        // Record camera state
        this._lastCameraX = camera.x;
        this._lastCameraY = camera.y;
        this._lastZoom = camera.zoom;
        this._staticLayerDirty = false;
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
     */
    private _renderMonsterAdditionalComponents(monster: any, ctx: CanvasRenderingContext2D): void {
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

        // Render HP bar using unified StatusBar
        if (monster.maxHp > 0 && !monster.isDead()) {
            const barH = monster.hpBarHeight;
            const barX = monster.pos.x - monster.r;
            const barY = monster.pos.y - monster.r + BAR_OFFSET.HP_TOP * barH;
            const barW = monster.r * 2;
            const hpRate = monster.hp / monster.maxHp;

            // Use monster's _hpBarCache (inherited from CircleObject)
            const cache: StatusBarCache = monster._hpBarCache;
            renderStatusBar(ctx, {
                x: barX,
                y: barY,
                width: barW,
                height: barH,
                fillRate: hpRate,
                fillColor: monster.hpColor,
                showText: true,
                textValue: monster.hp,
                cache: cache
            });
        }
    }

    private _renderPlacementPreview(ctx: CanvasRenderingContext2D): void {
        const { user } = this._context;
        if (user.putLoc.building !== null && user.putLoc.building !== undefined) {
            const x = user.putLoc.x;
            const y = user.putLoc.y;
            const building = user.putLoc.building as any;

            // 渲染建筑体圆圈
            if (!this._previewBodyCircle) {
                this._previewBodyCircle = new Circle(x, y, building.r);
            } else {
                this._previewBodyCircle.x = x;
                this._previewBodyCircle.y = y;
                this._previewBodyCircle.r = building.r;
            }
            this._previewBodyCircle.renderView(ctx);

            // 渲染射程圆圈（炮塔）
            if (building.rangeR !== undefined && building.rangeR > 0) {
                if (!this._previewRangeCircle) {
                    this._previewRangeCircle = new Circle(x, y, building.rangeR);
                } else {
                    this._previewRangeCircle.x = x;
                    this._previewRangeCircle.y = y;
                    this._previewRangeCircle.r = building.rangeR;
                }
                this._previewRangeCircle.renderView(ctx);
            }

            // 渲染维修半径圆圈（维修塔）
            if (building.otherHpAddAble && building.otherHpAddRadius !== undefined && building.otherHpAddRadius > 0) {
                if (!this._previewRepairCircle) {
                    this._previewRepairCircle = new Circle(x, y, building.otherHpAddRadius);
                    // 设置为绿色样式，与建筑静态渲染的维修范围一致
                    this._previewRepairCircle.fillColor.setRGBA(0, 0, 0, 0);
                    this._previewRepairCircle.strokeColor.setRGBA(81, 139, 60, 1);
                    this._previewRepairCircle.setStrokeWidth(0.5);
                } else {
                    this._previewRepairCircle.x = x;
                    this._previewRepairCircle.y = y;
                    this._previewRepairCircle.r = building.otherHpAddRadius;
                }
                this._previewRepairCircle.render(ctx);
            }
        }
    }

    /**
     * 渲染移动模式下选中建筑的75px范围圈
     */
    private _renderMoveRangePreview(ctx: CanvasRenderingContext2D): void {
        const { user } = this._context;
        const moveTarget = user.moveTarget;
        if (!moveTarget) return;

        const MOVE_MAX_DISTANCE = 75;

        // 更新或创建移动范围圈
        if (!this._moveRangeCircle) {
            this._moveRangeCircle = new Circle(moveTarget.x, moveTarget.y, MOVE_MAX_DISTANCE);
        } else {
            this._moveRangeCircle.x = moveTarget.x;
            this._moveRangeCircle.y = moveTarget.y;
            this._moveRangeCircle.r = MOVE_MAX_DISTANCE;
        }

        // 使用虚线样式渲染范围圈
        ctx.save();
        ctx.strokeStyle = "#4CAF50";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(moveTarget.x, moveTarget.y, MOVE_MAX_DISTANCE, 0, Math.PI * 2);
        ctx.stroke();

        // 渲染选中建筑的高亮轮廓
        ctx.strokeStyle = "#FFEB3B";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(moveTarget.x, moveTarget.y, moveTarget.r + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    private _updateFpsTps(): void {
        this._frameCount++;
        const now = performance.now();
        if (now - this._lastStatsUpdate >= this._statsUpdateInterval) {
            const elapsed = now - this._lastStatsUpdate;
            this._fps = Math.round(this._frameCount * 1000 / elapsed);
            this._tps = Math.round((this._context.time - this._lastTickCount) * 1000 / elapsed);
            this._frameCount = 0;
            this._lastTickCount = this._context.time;
            this._lastStatsUpdate = now;
        }
    }

    private _updateUiState(): void {
        const { user, monsters, batterys, camera, energy, monsterFlow } = this._context;
        const nextState: UiStateCache = {
            money: user.money,
            monsterCount: monsters.size,
            batteryCount: batterys.length,
            nextWave: monsterFlow?.toString() ?? "",
            wave: (monsterFlow?.level ?? 1) - 1,
            countdown: monsterFlow?.delayTick ?? 0,
            zoom: Math.round(camera.zoom * 100),
            tps: this._tps,
            fps: this._fps,
            energyProd: energy?.getTotalProduction() ?? 0,
            energyCons: energy?.getTotalConsumption() ?? 0
        };

        let changed = false;
        for (const key of Object.keys(nextState) as (keyof UiStateCache)[]) {
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

    /**
     * Render UI layer directly to the main canvas (no offscreen buffer needed for simple text)
     */
    private _renderUiLayer(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.scale(PR, PR);

        ctx.font = WorldRenderer.FONT_16;
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
