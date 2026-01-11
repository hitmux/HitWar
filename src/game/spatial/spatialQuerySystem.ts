/**
 * SpatialQuerySystem - 空间查询系统
 * 负责管理空间索引和提供高效的范围查询
 */

import { QuadTree } from '../../core/physics/quadTree';
import { SpatialHashGrid } from '../../core/physics/spatialHashGrid';

// 可被空间索引的实体接口
export interface SpatialEntity {
    pos: { x: number; y: number };
    r: number;
    _gridCells?: Set<number>;
}

// 可被 QuadTree 索引的建筑接口
export interface BuildingEntity {
    pos: { x: number; y: number };
    getBodyCircle(): any; // Returns Circle or compatible object
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
    monsterGrid: SpatialHashGrid<SpatialEntity> | null = null;
    bullyGrid: SpatialHashGrid<SpatialEntity> | null = null;

    // Dirty flags for QuadTree optimization
    private _buildingQuadTreeDirty: boolean = true;

    // Dirty sets for incremental grid updates
    private _dirtyMonsters: Set<SpatialEntity> = new Set();
    private _dirtyBullys: Set<SpatialEntity> = new Set();

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
    markEntityDirty(entity: SpatialEntity, isMonster: boolean): void {
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
    clearEntityDirty(entity: SpatialEntity, isMonster: boolean): void {
        if (isMonster) {
            this._dirtyMonsters.delete(entity);
        } else {
            this._dirtyBullys.delete(entity);
        }
    }

    /**
     * Insert monster into spatial grid
     */
    insertMonster(monster: SpatialEntity): void {
        this.monsterGrid?.insert(monster as any);
    }

    /**
     * Remove monster from spatial grid
     */
    removeMonster(monster: SpatialEntity): void {
        this._dirtyMonsters.delete(monster);
        this.monsterGrid?.remove(monster as any);
    }

    /**
     * Insert bullet into spatial grid
     */
    insertBully(bully: SpatialEntity): void {
        this.bullyGrid?.insert(bully as any);
    }

    /**
     * Remove bullet from spatial grid
     */
    removeBully(bully: SpatialEntity): void {
        this._dirtyBullys.delete(bully);
        this.bullyGrid?.remove(bully as any);
    }

    /**
     * Update spatial indices for collision queries
     * @param buildings - Current buildings array
     * @param towers - Current towers array
     * @param monsters - Current monsters set
     * @param bullys - Current bullets set
     */
    rebuildQuadTrees(
        buildings: BuildingEntity[],
        towers: BuildingEntity[],
        monsters: Set<SpatialEntity>,
        bullys: Set<SpatialEntity>
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
                this.buildingQuadTree.insert(b as any);
            }
            for (const t of towers) {
                this.buildingQuadTree.insert(t as any);
            }
            this._buildingQuadTreeDirty = false;
        }
    }

    /**
     * Get monsters near a position using spatial hash grid
     */
    getMonstersInRange(x: number, y: number, radius: number, fallbackSet?: Set<SpatialEntity>): SpatialEntity[] {
        if (this.monsterGrid) {
            return this.monsterGrid.queryRange(x, y, radius) as SpatialEntity[];
        }
        return fallbackSet ? Array.from(fallbackSet) : [];
    }

    /**
     * Get buildings near a position using quadtree
     */
    getBuildingsInRange(x: number, y: number, radius: number, fallbackArr?: BuildingEntity[]): BuildingEntity[] {
        if (this.buildingQuadTree) {
            return this.buildingQuadTree.retrieveInRange(x, y, radius) as unknown as BuildingEntity[];
        }
        return fallbackArr || [];
    }

    /**
     * Get bullets in range using spatial hash grid
     */
    getBullysInRange(x: number, y: number, radius: number, fallbackSet?: Set<SpatialEntity>): SpatialEntity[] {
        if (this.bullyGrid) {
            return this.bullyGrid.queryRange(x, y, radius) as SpatialEntity[];
        }
        return fallbackSet ? Array.from(fallbackSet) : [];
    }

    /**
     * Apply incremental spatial grid updates with periodic full calibration
     */
    private _syncSpatialGrids(monsters: Set<SpatialEntity>, bullys: Set<SpatialEntity>): void {
        const needFullSync = this._gridFullSyncCountdown <= 0;

        if (this.monsterGrid) {
            if (needFullSync) {
                this.monsterGrid.updateAll(monsters as any);
            } else if (this._dirtyMonsters.size) {
                for (const monster of this._dirtyMonsters) {
                    this.monsterGrid.update(monster as any);
                }
            }
        }

        if (this.bullyGrid) {
            if (needFullSync) {
                this.bullyGrid.updateAll(bullys as any);
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
}
