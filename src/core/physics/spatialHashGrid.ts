/**
 * SpatialHashGrid - Spatial partitioning using hash grid for fast collision queries
 * Optimized for frequently moving objects (monsters, bullets)
 */

export interface SpatialGridObject {
    pos: { x: number; y: number };
    r: number;
    _gridCells?: Set<number>;  // Cached cell indices
}

export class SpatialHashGrid<T extends SpatialGridObject> {
    private cellSize: number;
    private invCellSize: number;
    private cols: number;
    private cells: Map<number, Set<T>> = new Map();
    // Offset to handle negative coordinates (ensures hash is always positive)
    private offsetX: number;
    private offsetY: number;

    // Set object pool to reduce GC pressure
    private _setPool: Set<number>[] = [];

    constructor(width: number, height: number, cellSize: number = 64) {
        this.cellSize = cellSize;
        this.invCellSize = 1 / cellSize;
        // Support negative coordinates: margin based on max spawn radius (0.7 * max dimension)
        const margin = Math.ceil(Math.max(width, height) * 0.7 / cellSize);
        this.offsetX = margin;
        this.offsetY = margin;
        // Total columns = world cells + margin on both sides
        this.cols = Math.ceil(width / cellSize) + margin * 2;
    }

    /**
     * Compute hash for cell coordinates with offset to handle negative values
     */
    private _hash(cx: number, cy: number): number {
        return (cy + this.offsetY) * this.cols + (cx + this.offsetX);
    }

    /**
     * Acquire a Set from pool or create new one
     */
    private _acquireSet(): Set<number> {
        return this._setPool.pop() || new Set<number>();
    }

    /**
     * Release a Set back to pool
     */
    private _releaseSet(set: Set<number>): void {
        set.clear();
        this._setPool.push(set);
    }

    /**
     * Insert object (call when first adding)
     */
    insert(obj: T): void {
        const cells = this._acquireSet();
        this._fillCells(obj, cells);
        obj._gridCells = cells;
        for (const cell of cells) {
            this._getBucket(cell).add(obj);
        }
    }

    /**
     * Remove object from grid
     */
    remove(obj: T): void {
        if (obj._gridCells) {
            for (const cell of obj._gridCells) {
                this.cells.get(cell)?.delete(obj);
            }
            this._releaseSet(obj._gridCells);
            obj._gridCells = undefined;
        }
    }

    /**
     * Update object position (call each frame)
     */
    update(obj: T): void {
        const newCells = this._acquireSet();
        this._fillCells(obj, newCells);

        const oldCells = obj._gridCells;

        if (!oldCells) {
            // First insert
            obj._gridCells = newCells;
            for (const cell of newCells) {
                this._getBucket(cell).add(obj);
            }
            return;
        }

        // Incremental update: only process changed cells
        for (const cell of oldCells) {
            if (!newCells.has(cell)) {
                this.cells.get(cell)?.delete(obj);
            }
        }
        for (const cell of newCells) {
            if (!oldCells.has(cell)) {
                this._getBucket(cell).add(obj);
            }
        }

        this._releaseSet(oldCells);
        obj._gridCells = newCells;
    }

    /**
     * Batch update all objects
     */
    updateAll(objects: Iterable<T>): void {
        for (const obj of objects) {
            this.update(obj);
        }
    }

    /**
     * Query objects in circular range
     */
    queryRange(x: number, y: number, radius: number): T[] {
        const result: T[] = [];
        const seen = new Set<T>();

        const minCX = Math.floor((x - radius) * this.invCellSize);
        const maxCX = Math.floor((x + radius) * this.invCellSize);
        const minCY = Math.floor((y - radius) * this.invCellSize);
        const maxCY = Math.floor((y + radius) * this.invCellSize);

        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                const hash = this._hash(cx, cy);
                const bucket = this.cells.get(hash);
                if (bucket) {
                    for (const obj of bucket) {
                        if (!seen.has(obj)) {
                            seen.add(obj);
                            result.push(obj);
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * Clear the grid
     */
    clear(): void {
        this.cells.clear();
    }

    /**
     * Fill cells that an object occupies into the provided Set
     */
    private _fillCells(obj: T, result: Set<number>): void {
        const minCX = Math.floor((obj.pos.x - obj.r) * this.invCellSize);
        const maxCX = Math.floor((obj.pos.x + obj.r) * this.invCellSize);
        const minCY = Math.floor((obj.pos.y - obj.r) * this.invCellSize);
        const maxCY = Math.floor((obj.pos.y + obj.r) * this.invCellSize);

        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                result.add(this._hash(cx, cy));
            }
        }
    }

    /**
     * Get or create bucket for a cell
     */
    private _getBucket(hash: number): Set<T> {
        let bucket = this.cells.get(hash);
        if (!bucket) {
            bucket = new Set();
            this.cells.set(hash, bucket);
        }
        return bucket;
    }
}
