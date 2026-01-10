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

    constructor(width: number, height: number, cellSize: number = 64) {
        this.cellSize = cellSize;
        this.invCellSize = 1 / cellSize;
        // Extra margin for objects outside bounds
        this.cols = Math.ceil(width / cellSize) + 4;
    }

    /**
     * Insert object (call when first adding)
     */
    insert(obj: T): void {
        const cells = this._computeCells(obj);
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
            obj._gridCells = undefined;
        }
    }

    /**
     * Update object position (call each frame)
     */
    update(obj: T): void {
        const newCells = this._computeCells(obj);
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
                const hash = cy * this.cols + cx;
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
     * Compute which cells an object occupies
     */
    private _computeCells(obj: T): Set<number> {
        const result = new Set<number>();
        const minCX = Math.floor((obj.pos.x - obj.r) * this.invCellSize);
        const maxCX = Math.floor((obj.pos.x + obj.r) * this.invCellSize);
        const minCY = Math.floor((obj.pos.y - obj.r) * this.invCellSize);
        const maxCY = Math.floor((obj.pos.y + obj.r) * this.invCellSize);

        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                result.add(cy * this.cols + cx);
            }
        }
        return result;
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
