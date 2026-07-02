/**
 * SpatialHashGrid - Spatial partitioning for fast range queries
 * Optimized for frequently moving objects (monsters, bullets)
 * Server-side version adapted for Colyseus schema entities
 */

/**
 * Interface for objects that can be stored in the spatial grid
 */
export interface SpatialEntity {
  position: { x: number; y: number };
  radius: number;
  id: string;
}

/**
 * Internal tracking for grid cell membership
 */
interface GridTracking {
  cells: Set<number>;
}

export class SpatialHashGrid<T extends SpatialEntity> {
  private cellSize: number;
  private invCellSize: number;
  private cols: number;
  private cells: Map<number, Set<T>> = new Map();
  // Offset to handle negative coordinates
  private offsetX: number;
  private offsetY: number;

  // Track which cells each entity is in
  private entityCells: Map<string, GridTracking> = new Map();

  // Set pool to reduce GC pressure
  private setPool: Set<number>[] = [];

  constructor(width: number, height: number, cellSize: number = 64) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    // Support negative coordinates: margin based on max spawn radius
    const margin = Math.ceil((Math.max(width, height) * 0.7) / cellSize);
    this.offsetX = margin;
    this.offsetY = margin;
    // Total columns = world cells + margin on both sides
    this.cols = Math.ceil(width / cellSize) + margin * 2;
  }

  /**
   * Compute hash for cell coordinates with offset
   */
  private hash(cx: number, cy: number): number {
    return (cy + this.offsetY) * this.cols + (cx + this.offsetX);
  }

  /**
   * Acquire a Set from pool or create new one
   */
  private acquireSet(): Set<number> {
    return this.setPool.pop() || new Set<number>();
  }

  /**
   * Release a Set back to pool
   */
  private releaseSet(set: Set<number>): void {
    set.clear();
    this.setPool.push(set);
  }

  /**
   * Insert object into grid
   */
  insert(obj: T): void {
    const cells = this.acquireSet();
    this.fillCells(obj, cells);
    this.entityCells.set(obj.id, { cells });

    for (const cell of cells) {
      this.getBucket(cell).add(obj);
    }
  }

  /**
   * Remove object from grid
   */
  remove(obj: T): void {
    const tracking = this.entityCells.get(obj.id);
    if (tracking) {
      for (const cell of tracking.cells) {
        this.cells.get(cell)?.delete(obj);
      }
      this.releaseSet(tracking.cells);
      this.entityCells.delete(obj.id);
    }
  }

  /**
   * Update object position in grid
   */
  update(obj: T): void {
    const newCells = this.acquireSet();
    this.fillCells(obj, newCells);

    const tracking = this.entityCells.get(obj.id);

    if (!tracking) {
      // First insert
      this.entityCells.set(obj.id, { cells: newCells });
      for (const cell of newCells) {
        this.getBucket(cell).add(obj);
      }
      return;
    }

    const oldCells = tracking.cells;

    // Incremental update: only process changed cells
    for (const cell of oldCells) {
      if (!newCells.has(cell)) {
        this.cells.get(cell)?.delete(obj);
      }
    }
    for (const cell of newCells) {
      if (!oldCells.has(cell)) {
        this.getBucket(cell).add(obj);
      }
    }

    this.releaseSet(oldCells);
    tracking.cells = newCells;
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
    const seen = new Set<string>();

    const minCX = Math.floor((x - radius) * this.invCellSize);
    const maxCX = Math.floor((x + radius) * this.invCellSize);
    const minCY = Math.floor((y - radius) * this.invCellSize);
    const maxCY = Math.floor((y + radius) * this.invCellSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const hash = this.hash(cx, cy);
        const bucket = this.cells.get(hash);
        if (bucket) {
          for (const obj of bucket) {
            if (!seen.has(obj.id)) {
              seen.add(obj.id);
              result.push(obj);
            }
          }
        }
      }
    }
    return result;
  }

  /**
   * Query objects in rectangular range
   */
  queryRect(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const result: T[] = [];
    const seen = new Set<string>();

    const minCX = Math.floor(minX * this.invCellSize);
    const maxCX = Math.floor(maxX * this.invCellSize);
    const minCY = Math.floor(minY * this.invCellSize);
    const maxCY = Math.floor(maxY * this.invCellSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const hash = this.hash(cx, cy);
        const bucket = this.cells.get(hash);
        if (bucket) {
          for (const obj of bucket) {
            if (!seen.has(obj.id)) {
              seen.add(obj.id);
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
    this.entityCells.clear();
  }

  /**
   * Fill cells that an object occupies into the provided Set
   */
  private fillCells(obj: T, result: Set<number>): void {
    const r = obj.radius;
    const minCX = Math.floor((obj.position.x - r) * this.invCellSize);
    const maxCX = Math.floor((obj.position.x + r) * this.invCellSize);
    const minCY = Math.floor((obj.position.y - r) * this.invCellSize);
    const maxCY = Math.floor((obj.position.y + r) * this.invCellSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        result.add(this.hash(cx, cy));
      }
    }
  }

  /**
   * Get or create bucket for a cell
   */
  private getBucket(hash: number): Set<T> {
    let bucket = this.cells.get(hash);
    if (!bucket) {
      bucket = new Set();
      this.cells.set(hash, bucket);
    }
    return bucket;
  }
}
