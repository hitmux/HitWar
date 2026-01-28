/**
 * EntityManager - 实体管理器
 * 负责管理游戏中所有实体的增删和查询
 */

import { Vector } from '../../core/math/vector';
import { SpatialQuerySystem, SpatialEntity } from '../spatial';
import { EffectCircle } from '../../effects/effectCircle';
import { EffectLine } from '../../effects/effectLine';
import { Mine } from '../../systems/energy/mine';
import type { IEffect } from '../../types';

// 塔防实体接口
export interface TowerLike {
    pos: Vector;
    bullys: Set<unknown>;
    isDead: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    getBodyCircle: () => any; // Returns Circle or compatible object
    // 分离的移动和碰撞方法
    goStepMove: () => void;
    goStepCollide: () => void;
}

// 建筑实体接口
export interface BuildingLike {
    pos: Vector;
    gameType?: string;
    isDead: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    destroy?: (skipRemoveFromBuildings?: boolean) => void;
    getBodyCircle: () => any; // Returns Circle or compatible object
}

// 怪物实体接口
export interface MonsterLike extends SpatialEntity {
    pos: Vector;
    r: number;
    maxHp: number;
    hpInit: (hp: number) => void;
    addPrice: number;
    colishDamage: number;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    // 分离的移动和碰撞方法
    updateState: () => void;  // 状态更新（死亡检查等）
    moveOnly: () => void;
    clashOnly: () => void;
    // 边界检查
    isOutScreen: () => boolean;
    // 上一帧位置（用于扫掠碰撞检测）
    prevX: number;
    prevY: number;
}

// 子弹实体接口
export interface BullyLike extends SpatialEntity {
    pos: Vector;
    r: number;
    isOutScreen: () => boolean;
    goStep: () => void;
    render: (ctx: CanvasRenderingContext2D) => void;
    // 分离的移动和碰撞方法
    move: () => void;
    collide: (world: any) => void;
    // 上一帧位置（用于扫掠碰撞检测）
    prevX: number;
    prevY: number;
}


// 实体管理器需要的上下文接口
export interface EntityManagerContext {
    territory?: {
        addBuildingIncremental: (building: any) => void;
        removeBuildingIncremental: (building: any) => void;
    };
}

// 实体移除回调
export interface EntityRemovalCallbacks {
    onTowerRemoved?: () => void;
    onBuildingRemoved?: () => void;
}

/**
 * 实体管理器
 * 管理塔、建筑、怪物、子弹、效果等所有游戏实体
 */
export class EntityManager {
    // Entity collections
    batterys: TowerLike[] = [];
    buildings: BuildingLike[] = [];
    mines: Set<Mine> = new Set();
    monsters: Set<MonsterLike> = new Set();
    effects: Set<IEffect> = new Set();
    othersBullys: BullyLike[] = [];
    allBullys: Set<BullyLike> = new Set();

    // Per-frame render caches
    private _monsterRenderList: MonsterLike[] = [];
    private _monsterRenderListDirty = false;

    // References
    private readonly _spatialSystem: SpatialQuerySystem;
    private readonly _context: EntityManagerContext;

    constructor(spatialSystem: SpatialQuerySystem, context: EntityManagerContext) {
        this._spatialSystem = spatialSystem;
        this._context = context;
    }

    /**
     * Add a tower to the world
     */
    addTower(tower: TowerLike): void {
        this.batterys.push(tower);
        this._spatialSystem.markBuildingQuadTreeDirty();
        // Use incremental update for territory
        if (this._context.territory) {
            this._context.territory.addBuildingIncremental(tower as any);
        }
    }

    /**
     * Add a monster to the world
     */
    addMonster(monster: MonsterLike): void {
        this.monsters.add(monster);
        this._monsterRenderList.push(monster);
        this._spatialSystem.insertMonster(monster);
    }

    /**
     * Remove a monster from the world
     * Uses lazy rebuild for O(1) removal instead of O(n) indexOf+splice
     */
    removeMonster(monster: MonsterLike): void {
        if (this.monsters.delete(monster)) {
            this._monsterRenderListDirty = true;
        }
        this._spatialSystem.removeMonster(monster);
    }

    /**
     * Add an effect to the world
     */
    addEffect(effect: IEffect): void {
        this.effects.add(effect);
    }

    /**
     * Add a building to the world
     */
    addBuilding(building: BuildingLike): void {
        this.buildings.push(building);
        this._spatialSystem.markBuildingQuadTreeDirty();
        // Use incremental update for territory
        if (this._context.territory) {
            this._context.territory.addBuildingIncremental(building as any);
        }
    }

    /**
     * Add bullet to global cache
     */
    addBully(bully: BullyLike): void {
        this.allBullys.add(bully);
        this._spatialSystem.insertBully(bully);
    }

    /**
     * Remove bullet from global cache
     */
    removeBully(bully: BullyLike): void {
        this.allBullys.delete(bully);
        this._spatialSystem.removeBully(bully);
    }

    /**
     * Mark moving spatial object dirty so grid can update lazily
     */
    markSpatialDirty(entity: any): void {
        if (!entity) return;
        if (this.monsters.has(entity as MonsterLike)) {
            this._spatialSystem.markEntityDirty(entity, true);
        } else if (this.allBullys.has(entity as BullyLike)) {
            this._spatialSystem.markEntityDirty(entity, false);
        }
    }

    /**
     * Get all friendly entities (buildings + towers)
     */
    getAllBuildingArr(): (TowerLike | BuildingLike)[] {
        const res: (TowerLike | BuildingLike)[] = [];
        for (const item of this.buildings) {
            res.push(item);
        }
        for (const item of this.batterys) {
            res.push(item);
        }
        return res;
    }

    /**
     * Get all friendly bullets as array
     * @deprecated Use this.allBullys instead to avoid rebuilding array
     */
    getAllBullyToArr(): BullyLike[] {
        const res: BullyLike[] = [];
        for (const tower of this.batterys) {
            for (const b of tower.bullys) {
                res.push(b as BullyLike);
            }
        }
        for (const b of this.othersBullys) {
            res.push(b);
        }
        return res;
    }

    /**
     * Get monsters render list (lazy rebuild on dirty)
     */
    getMonsterRenderList(): MonsterLike[] {
        if (this._monsterRenderListDirty) {
            this._monsterRenderList.length = 0;
            for (const monster of this.monsters) {
                this._monsterRenderList.push(monster);
            }
            this._monsterRenderListDirty = false;
        }
        return this._monsterRenderList;
    }

    /**
     * Force sync monster render list from set
     */
    syncMonsterRenderListFromSet(): MonsterLike[] {
        this._monsterRenderListDirty = true;
        return this.getMonsterRenderList();
    }

    /**
     * Clean up dead/removed entities
     * Returns true if any tower or building was removed (needs quadtree rebuild)
     */
    cleanupEntities(callbacks?: EntityRemovalCallbacks): { towerRemoved: boolean; buildingRemoved: boolean } {
        let towerRemoved = false;
        let buildingRemoved = false;

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
        writeIdx = 0;
        for (let i = 0; i < this.batterys.length; i++) {
            const t = this.batterys[i];
            if (!t.isDead()) {
                this.batterys[writeIdx++] = t;
            } else {
                towerRemoved = true;
                // Incremental update for immediate territory response (no 100ms delay)
                this._context.territory?.removeBuildingIncremental(t as any);
                const e = EffectCircle.acquire(t.pos);
                e.animationFunc = e.destroyAnimation;
                this.addEffect(e as unknown as IEffect);
            }
        }
        this.batterys.length = writeIdx;

        // Clear buildings (in-place filter)
        writeIdx = 0;
        for (let i = 0; i < this.buildings.length; i++) {
            const b = this.buildings[i];
            if (!b.isDead()) {
                this.buildings[writeIdx++] = b;
            } else {
                buildingRemoved = true;
                // Incremental update for immediate territory response (no 100ms delay)
                this._context.territory?.removeBuildingIncremental(b as any);
                if (b.gameType === "Mine" && b.destroy) {
                    b.destroy(true);
                }
            }
        }
        this.buildings.length = writeIdx;

        // Clear monsters that are out of bounds (safety check)
        for (const m of this.monsters) {
            if (m.isOutScreen()) {
                this.removeMonster(m);
            }
        }

        // Mark spatial system dirty if needed
        if (towerRemoved || buildingRemoved) {
            this._spatialSystem.markBuildingQuadTreeDirty();
            // Territory already updated incrementally above, no need for markDirty()
            callbacks?.onTowerRemoved?.();
            callbacks?.onBuildingRemoved?.();
        }

        // Clear effects and return to object pool
        for (const e of this.effects) {
            if (!e.isPlay) {
                this.effects.delete(e);
                if (e instanceof EffectLine) {
                    EffectLine.release(e);
                } else if (e instanceof EffectCircle) {
                    EffectCircle.release(e as any);
                }
            }
        }

        return { towerRemoved, buildingRemoved };
    }

    /**
     * Update all entities (call goStep)
     * 使用三阶段更新：状态更新 -> 移动 -> 碰撞检测
     * 这样可以使用相对速度扫掠检测来避免高速移动的穿透问题
     */
    updateEntities(): void {
        // === 阶段0: 怪物状态更新（包括死亡检查） ===
        for (const m of this.monsters) {
            m.updateState();
        }

        // === 阶段1: 所有实体执行移动 ===
        // Tower 移动（塔自身和子弹的移动）
        for (const b of this.batterys) {
            b.goStepMove();
        }
        // Standalone bullet 移动
        for (const p of this.othersBullys) {
            p.move();
        }
        // Monster 移动
        for (const m of this.monsters) {
            m.moveOnly();
        }

        // === 阶段2: 所有碰撞检测 ===
        // Tower 碰撞检测（子弹碰撞和攻击逻辑）
        for (const b of this.batterys) {
            b.goStepCollide();
        }
        // Standalone bullet 碰撞检测
        for (const p of this.othersBullys) {
            p.collide(this._context as any);
        }
        // Monster 碰撞检测
        for (const m of this.monsters) {
            m.clashOnly();
        }

        // === 阶段3: 其他逻辑（建筑、矿点、效果不需要分离） ===
        // Building actions
        for (const b of this.buildings) {
            b.goStep();
        }
        // Mine actions
        for (const m of this.mines) {
            m.goStep();
        }
        // Effect steps
        for (const e of this.effects) {
            e.goStep();
        }
    }
}
