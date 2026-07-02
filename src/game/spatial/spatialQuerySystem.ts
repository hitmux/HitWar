/**
 * SpatialQuerySystem - 空间查询系统
 * 负责管理空间索引和提供高效的范围查询
 */

import { QuadTree } from '../../core/physics/quadTree';
import { SpatialHashGrid, SpatialGridObject } from '../../core/physics/spatialHashGrid';

// Re-export SpatialGridObject for consumers
export type { SpatialGridObject };

// Structural type for QuadTree-compatible entities
export interface QuadTreeEntity {
    pos: { x: number; y: number };
    r: number;
}

// 空间查询系统需要的上下文接口
export interface SpatialQueryContext {
    width: number;
    height: number;
}

/**
 * 空间查询系统
 * 管理 QuadTree (静态建筑) 和 SpatialHashGrid (移动实体)
 */
export class SpatialQuerySystem {
    // QuadTree for static buildings only
    buildingQuadTree: QuadTree | null = null;

    // Spatial hash grids for moving objects (monsters, bullets)
    monsterGrid: SpatialHashGrid<SpatialGridObject> | null = null;
    bullyGrid: SpatialHashGrid<SpatialGridObject> | null = null;

    // Dirty flags for QuadTree optimization
    private _buildingQuadTreeDirty: boolean = true;

    // Dirty sets for incremental grid updates
    private _dirtyMonsters: Set<SpatialGridObject> = new Set();
    private _dirtyBullys: Set<SpatialGridObject> = new Set();

    // Full sync configuration
    private _gridFullSyncInterval: number = 240;
    private _gridFullSyncCountdown: number = 0;

    // Context reference
    private readonly _context: SpatialQueryContext;

    constructor(context: SpatialQueryContext) {
        this._context = context;
        this._gridFullSyncCountdown = this._gridFullSyncInterval;

        // Initialize spatial hash grids
        this.monsterGrid = new SpatialHashGrid(context.width, context.height, 64);
        this.bullyGrid = new SpatialHashGrid(context.width, context.height, 64);
    }

    /**
     * Mark building quadtree as dirty (needs rebuild)
     */
    markBuildingQuadTreeDirty(): void {
        this._buildingQuadTreeDirty = true;
    }

    /**
     * Check if building quadtree is dirty
     */
    isBuildingQuadTreeDirty(): boolean {
        return this._buildingQuadTreeDirty;
    }

    /**
     * Mark a moving entity as dirty for lazy grid update
     */
    markEntityDirty(entity: SpatialGridObject, isMonster: boolean): void {
        if (!entity) return;
        if (isMonster) {
            this._dirtyMonsters.add(entity);
        } else {
            this._dirtyBullys.add(entity);
        }
    }

    /**
     * Remove entity from dirty set (called when entity is removed from world)
     */
    clearEntityDirty(entity: SpatialGridObject, isMonster: boolean): void {
        if (isMonster) {
            this._dirtyMonsters.delete(entity);
        } else {
            this._dirtyBullys.delete(entity);
        }
    }

    /**
     * Insert monster into spatial grid
     */
    insertMonster(monster: SpatialGridObject): void {
        this.monsterGrid?.insert(monster);
    }

    /**
     * Remove monster from spatial grid
     */
    removeMonster(monster: SpatialGridObject): void {
        this._dirtyMonsters.delete(monster);
        this.monsterGrid?.remove(monster);
    }

    /**
     * Insert bullet into spatial grid
     */
    insertBully(bully: SpatialGridObject): void {
        this.bullyGrid?.insert(bully);
    }

    /**
     * Remove bullet from spatial grid
     */
    removeBully(bully: SpatialGridObject): void {
        this._dirtyBullys.delete(bully);
        this.bullyGrid?.remove(bully);
    }

    /**
     * Update spatial indices for collision queries
     * @param buildings - Current buildings array
     * @param towers - Current towers array
     * @param monsters - Current monsters set
     * @param bullys - Current bullets set
     */
    rebuildQuadTrees(
        buildings: ReadonlyArray<QuadTreeEntity>,
        towers: ReadonlyArray<QuadTreeEntity>,
        monsters: Set<SpatialGridObject>,
        bullys: Set<SpatialGridObject>
    ): void {
        this._syncSpatialGrids(monsters, bullys);

        // Rebuild building quadtree only when dirty (buildings don't move)
        if (this._buildingQuadTreeDirty) {
            if (this.buildingQuadTree) {
                this.buildingQuadTree.clear();
            } else {
                this.buildingQuadTree = new QuadTree(0, 0, this._context.width, this._context.height);
            }
            for (const b of buildings) {
                this.buildingQuadTree.insert(b);
            }
            for (const t of towers) {
                this.buildingQuadTree.insert(t);
            }
            this._buildingQuadTreeDirty = false;
        }
    }

    /**
     * Get monsters near a position using spatial hash grid
     */
    getMonstersInRange(x: number, y: number, radius: number, fallbackSet?: Set<SpatialGridObject>): SpatialGridObject[] {
        if (this.monsterGrid) {
            return this.monsterGrid.queryRange(x, y, radius);
        }
        return fallbackSet ? Array.from(fallbackSet) : [];
    }

    /**
     * Get buildings near a position using quadtree
     */
    getBuildingsInRange(x: number, y: number, radius: number, fallbackArr?: ReadonlyArray<QuadTreeEntity>): QuadTreeEntity[] {
        if (this.buildingQuadTree) {
            return this.buildingQuadTree.retrieveInRange(x, y, radius);
        }
        return fallbackArr ? Array.from(fallbackArr) : [];
    }

    /**
     * Get bullets in range using spatial hash grid
     */
    getBullysInRange(x: number, y: number, radius: number, fallbackSet?: Set<SpatialGridObject>): SpatialGridObject[] {
        if (this.bullyGrid) {
            return this.bullyGrid.queryRange(x, y, radius);
        }
        return fallbackSet ? Array.from(fallbackSet) : [];
    }

    /**
     * Apply incremental spatial grid updates with periodic full calibration
     */
    private _syncSpatialGrids(monsters: Set<SpatialGridObject>, bullys: Set<SpatialGridObject>): void {
        const needFullSync = this._gridFullSyncCountdown <= 0;

        if (this.monsterGrid) {
            if (needFullSync) {
                this.monsterGrid.updateAll(monsters);
            } else if (this._dirtyMonsters.size) {
                for (const monster of this._dirtyMonsters) {
                    // Defensive check: only update if entity still exists
                    if (monsters.has(monster)) {
                        this.monsterGrid.update(monster);
                    }
                }
            }
        }

        if (this.bullyGrid) {
            if (needFullSync) {
                this.bullyGrid.updateAll(bullys);
            } else if (this._dirtyBullys.size) {
                for (const bully of this._dirtyBullys) {
                    // Defensive check: only update if entity still exists
                    if (bullys.has(bully)) {
                        this.bullyGrid.update(bully);
                    }
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
}
