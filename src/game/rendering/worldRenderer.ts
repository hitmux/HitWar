/**
 * WorldRenderer - 世界渲染器
 * 负责游戏世界的所有渲染逻辑
 */

import { Circle } from '../../core/math/circle';
import { Rectangle } from '../../core/math/rectangle';
import { Camera } from '../../core/camera';
import { Obstacle } from '../../core/physics/obstacle';
import { SpatialHashGrid } from '../../core/physics/spatialHashGrid';
import { PR } from '../../core/staticInitData';

// Monsters imports
import { getMonstersImg, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../../monsters/monsterConstants';
import { Monster } from '../../monsters/base/monster';

// Types
import type { TowerLike, BuildingLike, MonsterLike, BullyLike, EffectLike } from '../entities';
import type { Mine } from '../../systems/energy/mine';

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
    effects: Set<EffectLike>;
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
    };

    // Systems
    territory?: { renderer: { render: (ctx: CanvasRenderingContext2D) => void } };
    fog?: { renderer: { render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void } };
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

    // Obstacle cache
    private _obstacleCanvas: HTMLCanvasElement | null = null;
    private _obstacleCtx: CanvasRenderingContext2D | null = null;
    private _obstacleCacheValid: boolean = false;

    // Static layer cache (obstacles + static buildings)
    private _staticLayerCanvas: HTMLCanvasElement | null = null;
    private _staticLayerCtx: CanvasRenderingContext2D | null = null;
    private _staticLayerDirty: boolean = true;

    // UI layer cache
    private _uiCanvas: HTMLCanvasElement | null = null;
    private _uiCtx: CanvasRenderingContext2D | null = null;
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
     * Rebuild obstacle offscreen cache
     */
    rebuildObstacleCache(): void {
        if (!this._obstacleCanvas) {
            this._obstacleCanvas = document.createElement('canvas');
            this._obstacleCtx = this._obstacleCanvas.getContext('2d');
        }

        this._obstacleCanvas.width = this._context.width;
        this._obstacleCanvas.height = this._context.height;

        const ctx = this._obstacleCtx!;
        ctx.clearRect(0, 0, this._context.width, this._context.height);

        for (const obs of this._context.obstacles) {
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
            ctx.drawImage(this._staticLayerCanvas, 0, 0);
        }

        // Render territory
        if (this._context.territory) {
            this._context.territory.renderer.render(ctx);
        }

        // Render game objects (with view culling)
        for (const b of this._context.batterys) {
            if (this._isObjectVisible(b, this._visibleBounds)) {
                b.render(ctx);
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

        // Reset camera transform
        camera.resetTransform(ctx);

        // Calculate FPS and TPS
        this._updateFpsTps();

        // UI layer (fixed on screen) with dirty flag
        this._updateUiState();
        if (this._uiDirty) {
            this._renderUiLayer();
        }
        if (this._uiCanvas) {
            ctx.drawImage(this._uiCanvas, 0, 0);
        }

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

    private _ensureStaticLayerCache(): void {
        if (!this._staticLayerCanvas) {
            this._staticLayerCanvas = document.createElement('canvas');
            this._staticLayerCtx = this._staticLayerCanvas.getContext('2d');
            this._staticLayerDirty = true;
        }
        if (!this._staticLayerCanvas || !this._staticLayerCtx) {
            return;
        }

        const { width, height } = this._context;
        if (this._staticLayerCanvas.width !== width || this._staticLayerCanvas.height !== height) {
            this._staticLayerCanvas.width = width;
            this._staticLayerCanvas.height = height;
            this._staticLayerDirty = true;
        }

        if (!this._obstacleCacheValid) {
            this.rebuildObstacleCache();
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
        const { width, height, obstacles, buildings } = this._context;
        ctx.clearRect(0, 0, width, height);

        if (this._obstacleCanvas && this._obstacleCacheValid) {
            ctx.drawImage(this._obstacleCanvas, 0, 0);
        } else {
            for (const obs of obstacles) {
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

        for (const b of buildings) {
            if ((b as any).gameType === "Mine") continue;
            b.render(ctx);
        }

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

        const hpRate = monster.hp / monster.maxHp;

        if (monster.maxHp > 0) {
            if (!monster.isDead()) {
                const barH = monster.hpBarHeight;
                const barX = monster.pos.x - monster.r;
                const barY = monster.pos.y - monster.r - 2.5 * barH;
                const barW = monster.r * 2;

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

                const hpInt = Math.floor(monster.hp);
                if (hpInt !== monster._lastHpInt) {
                    monster._lastHpInt = hpInt;
                    monster._hpStr = hpInt.toString();
                }
                ctx.fillStyle = "black";
                ctx.font = "9px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(monster._hpStr, monster.pos.x, barY + 1);
            }
        }
    }

    private _renderPlacementPreview(ctx: CanvasRenderingContext2D): void {
        const { user } = this._context;
        if (user.putLoc.building !== null && user.putLoc.building !== undefined) {
            const x = user.putLoc.x;
            const y = user.putLoc.y;

            if (!this._previewBodyCircle) {
                this._previewBodyCircle = new Circle(x, y, user.putLoc.building.r);
            } else {
                this._previewBodyCircle.x = x;
                this._previewBodyCircle.y = y;
                this._previewBodyCircle.r = user.putLoc.building.r;
            }
            this._previewBodyCircle.renderView(ctx);

            if (!this._previewRangeCircle) {
                this._previewRangeCircle = new Circle(x, y, user.putLoc.building.rangeR);
            } else {
                this._previewRangeCircle.x = x;
                this._previewRangeCircle.y = y;
                this._previewRangeCircle.r = user.putLoc.building.rangeR;
            }
            this._previewRangeCircle.renderView(ctx);
        }
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

    private _ensureUiCanvas(): void {
        const { viewWidth, viewHeight } = this._context;
        if (!this._uiCanvas) {
            this._uiCanvas = document.createElement("canvas");
            this._uiCtx = this._uiCanvas.getContext("2d");
            this._uiDirty = true;
        }
        if (!this._uiCanvas || !this._uiCtx) {
            return;
        }
        const targetWidth = viewWidth * PR;
        const targetHeight = viewHeight * PR;
        if (this._uiCanvas.width !== targetWidth || this._uiCanvas.height !== targetHeight) {
            this._uiCanvas.width = targetWidth;
            this._uiCanvas.height = targetHeight;
            this._uiDirty = true;
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
