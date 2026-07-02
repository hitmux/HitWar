/**
 * TypedArray packing utilities for Worker message payloads
 * Only packs data for main thread → Worker direction.
 * Worker side reads directly by index.
 */

export interface PackedVisionSources {
    buffer: Float32Array;
    count: number;
}

export interface PackedBuildingPositions {
    buffer: Float32Array;
    count: number;
}

/** Minimal shape required for vision sources */
export interface VisionSourceLike {
    x: number;
    y: number;
    radius: number;
}

/** Minimal shape required for buildings */
export interface BuildingLike {
    pos: { x: number; y: number };
}

/**
 * Pack vision sources into Float32Array: [x, y, radius, x, y, radius, ...]
 * Returns a fresh buffer — safe to transfer to Worker.
 */
export function packVisionSources(sources: VisionSourceLike[]): PackedVisionSources {
    const count = sources.length;
    const buffer = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const src = sources[i];
        buffer[i * 3]     = src.x;
        buffer[i * 3 + 1] = src.y;
        buffer[i * 3 + 2] = src.radius;
    }
    return { buffer, count };
}

/**
 * Pack building positions into Float32Array: [x, y, x, y, ...]
 * Returns a fresh buffer — safe to transfer to Worker.
 */
export function packBuildingPositions(buildings: BuildingLike[]): PackedBuildingPositions {
    const count = buildings.length;
    const buffer = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
        const pos = buildings[i].pos;
        buffer[i * 2]     = pos.x;
        buffer[i * 2 + 1] = pos.y;
    }
    return { buffer, count };
}
