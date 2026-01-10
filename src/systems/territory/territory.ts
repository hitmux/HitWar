/**
 * Territory - Territory management core class
 * Manages building territory connectivity and penalty mechanics
 */

import { TerritoryRenderer } from './territoryRenderer';
import { Vector } from '../../core/math/vector';
import { QuadTree } from '../../core/physics/quadTree';
import type { FogOfWarLike } from '../../types/systems';

interface BuildingLike {
    pos: Vector;
    gameType?: string;
    otherHpAddAble?: boolean;
    moneyAddedAble?: boolean;
    maxHp: number;
    hp: number;
    rangeR?: number;
    inValidTerritory: boolean;
    _territoryPenaltyApplied: boolean;
    _originalMaxHp: number | null;
    _originalRangeR?: number | null;
}

interface WorldLike {
    width: number;
    height: number;
    rootBuilding: BuildingLike;
    batterys: BuildingLike[];
    buildings: BuildingLike[];
    mines: Set<BuildingLike>;
    fog?: FogOfWarLike;
}

export class Territory {
    world: WorldLike;
    territoryRadius: number = 100;  // Territory radius in px
    dirty: boolean = true;           // Dirty flag, needs recalculation
    private _pendingIdleCallback: number | null = null; // Track pending idle callback

    // Cache: buildings in valid territory
    validBuildings: Set<BuildingLike> = new Set();
    // Cache: buildings in invalid territory
    invalidBuildings: Set<BuildingLike> = new Set();

    // Grid cache for fast position queries
    private _gridCellSize: number = 50;  // Grid cell size in pixels
    private _validTerritoryGrid: Map<string, boolean> = new Map();  // Grid cache for valid territory
    private _anyTerritoryGrid: Map<string, boolean> = new Map();     // Grid cache for any territory
    private _gridCacheValid: boolean = false;  // Grid cache validity flag

    // Renderer
    renderer: TerritoryRenderer;

    constructor(world: WorldLike) {
        this.world = world;
        this.renderer = new TerritoryRenderer(this);
        // Perform initial calculation immediately (rootBuilding should be present)
        this.recalculate();
    }

    /**
     * Mark territory as needing recalculation (deferred via requestIdleCallback)
     */
    markDirty(): void {
        this.dirty = true;
        
        // Schedule deferred recalculation if not already pending
        if (this._pendingIdleCallback === null) {
            // Use requestIdleCallback if available, otherwise use setTimeout
            if (typeof requestIdleCallback !== 'undefined') {
                this._pendingIdleCallback = requestIdleCallback(() => {
                    this._pendingIdleCallback = null;
                    this.recalculate();
                }, { timeout: 100 }); // Max 100ms delay
            } else {
                // Fallback for browsers without requestIdleCallback
                this._pendingIdleCallback = window.setTimeout(() => {
                    this._pendingIdleCallback = null;
                    this.recalculate();
                }, 16) as unknown as number; // ~1 frame
            }
        }
    }

    /**
     * Recalculate territory connectivity (BFS algorithm)
     * Optimized: Uses index-based queue (O(1) dequeue) and QuadTree for spatial queries
     */
    recalculate(): void {
        if (!this.dirty) return;
        this.dirty = false;

        // Get buildings that can provide territory (towers, not repair towers or gold mines)
        const providers = this._getTerritoryProviders();
        // Get all buildings
        const allBuildings = this._getAllBuildings();

        // Build QuadTree for spatial queries (only for providers)
        // Use Map to map position to building for O(1) lookup
        const quadTree = new QuadTree(0, 0, this.world.width, this.world.height);
        const posToBuilding = new Map<string, BuildingLike>();
        
        for (const provider of providers) {
            const posKey = `${provider.pos.x},${provider.pos.y}`;
            posToBuilding.set(posKey, provider);
            quadTree.insert({
                pos: { x: provider.pos.x, y: provider.pos.y },
                r: this.territoryRadius * 2
            } as any);
        }

        const visited = new Set<BuildingLike>();
        // Use index-based queue to avoid O(n) shift() operations
        const queue: BuildingLike[] = [this.world.rootBuilding];
        let queueIndex = 0;
        visited.add(this.world.rootBuilding);

        // BFS traversal (only between territory providers)
        // Optimized: Use QuadTree to only check nearby buildings instead of all providers
        const searchRadius = this.territoryRadius * 2;
        while (queueIndex < queue.length) {
            const current = queue[queueIndex++];
            
            // Query nearby buildings using QuadTree (much faster than iterating all providers)
            const nearbyObjects = quadTree.retrieveInRange(
                current.pos.x,
                current.pos.y,
                searchRadius
            ) as any[];

            // Check each nearby building
            for (const quadObj of nearbyObjects) {
                const posKey = `${quadObj.pos.x},${quadObj.pos.y}`;
                const other = posToBuilding.get(posKey);
                
                if (other && !visited.has(other)) {
                    // Two buildings' territories overlap if distance <= 2 * territoryRadius
                    const dist = current.pos.dis(other.pos);
                    if (dist <= searchRadius) {
                        visited.add(other);
                        queue.push(other);
                    }
                }
            }
        }

        // Save old state for comparison
        const oldValid = new Set(this.validBuildings);
        const oldInvalid = new Set(this.invalidBuildings);

        this.validBuildings.clear();
        this.invalidBuildings.clear();

        // Update territory provider status
        for (const b of providers) {
            if (visited.has(b)) {
                this.validBuildings.add(b);
            } else {
                this.invalidBuildings.add(b);
            }
        }

        // Determine territory status for non-provider buildings (repair towers, gold mines)
        for (const b of allBuildings) {
            if (this._canProvideTerritory(b)) continue; // Already processed
            // Check if within range of any valid territory provider
            let inValid = false;
            const radiusSq = this.territoryRadius * this.territoryRadius;
            for (const vb of this.validBuildings) {
                if (vb.pos.disSq(b.pos) <= radiusSq) {
                    inValid = true;
                    break;
                }
            }
            if (inValid) {
                this.validBuildings.add(b);
            } else {
                this.invalidBuildings.add(b);
            }
        }

        // Handle state change: from invalid to valid
        for (const b of this.validBuildings) {
            if (oldInvalid.has(b)) {
                this._removeInvalidPenalty(b);
            }
        }

        // Handle state change: from valid to invalid, or new building directly in invalid area
        for (const b of this.invalidBuildings) {
            if (oldValid.has(b) || !oldInvalid.has(b)) {
                this._applyInvalidPenalty(b);
            }
        }

        // Invalidate renderer cache
        this.renderer.invalidateCache();

        // Invalidate grid cache (will be rebuilt on next query if needed)
        this._gridCacheValid = false;

        // Notify fog system (territory change affects vision sources)
        this.world.fog?.markDirty();
    }

    /**
     * Check if a position is in valid territory
     * Optimized: Uses grid cache for O(1) lookup in most cases
     */
    isPositionInValidTerritory(pos: Vector): boolean {
        // Rebuild grid cache if invalid
        if (!this._gridCacheValid) {
            this._rebuildValidTerritoryGrid();
        }

        // Query grid cache first (fast path)
        const gridKey = this._getGridKey(pos.x, pos.y);
        const gridValue = this._validTerritoryGrid.get(gridKey);
        
        // Fast path: if grid says true, directly return true
        // Grid cell size (50px) is smaller than territory radius (100px),
        // so if grid center is in territory, nearby points are likely in territory too
        if (gridValue === true) {
            return true;
        }
        
        // Grid says false or undefined (not marked), do exact check for edge cases
        // This handles positions near grid boundaries where grid might miss
        // But in most cases, if grid is not marked, there's no territory
        if (this.validBuildings.size === 0) {
            return false;
        }
        
        const radiusSq = this.territoryRadius * this.territoryRadius;
        for (const b of this.validBuildings) {
            if (b.pos.disSq(pos) <= radiusSq) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if a position is in any territory (valid or invalid)
     * Optimized: Uses grid cache for O(1) lookup in most cases
     */
    isPositionInAnyTerritory(pos: Vector): boolean {
        // Rebuild grid cache if invalid
        if (!this._gridCacheValid) {
            this._rebuildAnyTerritoryGrid();
        }

        // Query grid cache first (fast path)
        const gridKey = this._getGridKey(pos.x, pos.y);
        const gridValue = this._anyTerritoryGrid.get(gridKey);
        
        // Fast path: if grid says true, directly return true
        // Grid cell size (50px) is smaller than territory radius (100px),
        // so if grid center is in territory, nearby points are likely in territory too
        if (gridValue === true) {
            return true;
        }
        
        // Grid says false or undefined (not marked), do exact check for edge cases
        // This handles positions near grid boundaries where grid might miss
        const allBuildings = this._getAllBuildings();
        if (allBuildings.length === 0) {
            return false;
        }
        
        const radiusSq = this.territoryRadius * this.territoryRadius;
        for (const b of allBuildings) {
            if (b.pos.disSq(pos) <= radiusSq) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get all buildings list (towers + buildings + mines)
     */
    _getAllBuildings(): BuildingLike[] {
        return [...this.world.batterys, ...this.world.buildings, ...this.world.mines];
    }

    /**
     * Get grid key for a position
     */
    private _getGridKey(x: number, y: number): string {
        const gridX = Math.floor(x / this._gridCellSize);
        const gridY = Math.floor(y / this._gridCellSize);
        return `${gridX},${gridY}`;
    }

    /**
     * Rebuild grid cache for valid territory
     * Marks grid cells that contain valid territory buildings
     */
    private _rebuildValidTerritoryGrid(): void {
        this._validTerritoryGrid.clear();
        
        const radiusSq = this.territoryRadius * this.territoryRadius;
        
        // Mark grid cells that contain valid territory
        for (const b of this.validBuildings) {
            // Calculate grid bounds covered by this building's territory
            const minGridX = Math.floor((b.pos.x - this.territoryRadius) / this._gridCellSize);
            const maxGridX = Math.floor((b.pos.x + this.territoryRadius) / this._gridCellSize);
            const minGridY = Math.floor((b.pos.y - this.territoryRadius) / this._gridCellSize);
            const maxGridY = Math.floor((b.pos.y + this.territoryRadius) / this._gridCellSize);
            
            // Mark all grid cells that might intersect with this territory
            for (let gx = minGridX; gx <= maxGridX; gx++) {
                for (let gy = minGridY; gy <= maxGridY; gy++) {
                    const gridKey = `${gx},${gy}`;
                    // Check if grid cell center is within territory
                    const cellCenterX = (gx + 0.5) * this._gridCellSize;
                    const cellCenterY = (gy + 0.5) * this._gridCellSize;
                    const distSq = b.pos.disSq({ x: cellCenterX, y: cellCenterY } as Vector);
                    
                    if (distSq <= radiusSq) {
                        this._validTerritoryGrid.set(gridKey, true);
                    }
                }
            }
        }
        
        this._gridCacheValid = true;
    }

    /**
     * Rebuild grid cache for any territory (valid or invalid)
     * Marks grid cells that contain any territory buildings
     */
    private _rebuildAnyTerritoryGrid(): void {
        this._anyTerritoryGrid.clear();
        
        const allBuildings = this._getAllBuildings();
        const radiusSq = this.territoryRadius * this.territoryRadius;
        
        // Mark grid cells that contain any territory
        for (const b of allBuildings) {
            // Calculate grid bounds covered by this building's territory
            const minGridX = Math.floor((b.pos.x - this.territoryRadius) / this._gridCellSize);
            const maxGridX = Math.floor((b.pos.x + this.territoryRadius) / this._gridCellSize);
            const minGridY = Math.floor((b.pos.y - this.territoryRadius) / this._gridCellSize);
            const maxGridY = Math.floor((b.pos.y + this.territoryRadius) / this._gridCellSize);
            
            // Mark all grid cells that might intersect with this territory
            for (let gx = minGridX; gx <= maxGridX; gx++) {
                for (let gy = minGridY; gy <= maxGridY; gy++) {
                    const gridKey = `${gx},${gy}`;
                    // Check if grid cell center is within territory
                    const cellCenterX = (gx + 0.5) * this._gridCellSize;
                    const cellCenterY = (gy + 0.5) * this._gridCellSize;
                    const distSq = b.pos.disSq({ x: cellCenterX, y: cellCenterY } as Vector);
                    
                    if (distSq <= radiusSq) {
                        this._anyTerritoryGrid.set(gridKey, true);
                    }
                }
            }
        }
        
        this._gridCacheValid = true;
    }

    /**
     * Check if a building can provide territory
     * Repair towers and gold mines cannot provide territory
     */
    _canProvideTerritory(building: BuildingLike): boolean {
        // Headquarters can provide territory
        if (building === this.world.rootBuilding) return true;
        // Mines/power plants cannot provide territory (same as gold mines)
        if (building.gameType === "Mine") return false;
        // Repair towers and gold mines cannot provide territory
        if (building.otherHpAddAble || building.moneyAddedAble) return false;
        // Other buildings (towers) can provide territory
        return true;
    }

    /**
     * Get list of buildings that can provide territory
     */
    _getTerritoryProviders(): BuildingLike[] {
        return this._getAllBuildings().filter(b => this._canProvideTerritory(b));
    }

    /**
     * Apply invalid territory penalty
     */
    _applyInvalidPenalty(building: BuildingLike): void {
        // Headquarters is never penalized
        if (building === this.world.rootBuilding) return;

        // Skip if penalty already applied
        if (building._territoryPenaltyApplied) return;
        building._territoryPenaltyApplied = true;
        building.inValidTerritory = false;

        // HP halved (all buildings receive this penalty)
        building._originalMaxHp = building.maxHp;
        building.maxHp = Math.round(building.maxHp / 2);
        building.hp = Math.round(building.hp / 2);

        // Towers: save original range (for display, actual range calculated dynamically via getEffectiveRangeR())
        if (building.gameType === 'Tower') {
            building._originalRangeR = building.rangeR || null;
        }
    }

    /**
     * Remove invalid territory penalty
     */
    _removeInvalidPenalty(building: BuildingLike): void {
        // Headquarters is never penalized
        if (building === this.world.rootBuilding) return;

        // Skip if penalty not applied
        if (!building._territoryPenaltyApplied) return;
        building._territoryPenaltyApplied = false;
        building.inValidTerritory = true;

        // Restore max HP (current HP not restored)
        if (building._originalMaxHp !== null) {
            building.maxHp = building._originalMaxHp;
            building._originalMaxHp = null;
        }

        // Towers: clear original range backup
        if (building.gameType === 'Tower') {
            building._originalRangeR = null;
        }
    }
}
