/**
 * Worker message protocol types
 * Main thread <-> RenderWorker communication
 */

// ---------------------------------------------------------------------------
// Payloads (Main → Worker)
// ---------------------------------------------------------------------------

export interface InitPayload {
    // No data needed, just the handshake
}

/** Fog static layer rebuild payload */
export interface FogRebuildStaticPayload {
    // Canvas logical dimensions (before PR multiplication)
    canvasWidth: number;
    canvasHeight: number;
    pr: number;
    // Camera state
    cameraX: number;
    cameraY: number;
    cameraZoom: number;
    cameraViewWidth: number;
    cameraViewHeight: number;
    // World boundary (for buffer clipping)
    worldWidth: number;
    worldHeight: number;
    // Vision sources: Float32Array [x, y, radius, x, y, radius, ...]
    visionSourcesBuffer: Float32Array;
    visionSourcesCount: number;
    // Fog color (RGBA components)
    fogColorR: number;
    fogColorG: number;
    fogColorB: number;
    fogColorA: number;
    // Vision hole gradient params
    outerGradientSize: number;
}

/** Territory layer rebuild payload */
export interface TerritoryRebuildPayload {
    // Player ID for multiplayer routing
    playerId: string;
    // Canvas logical dimensions (before PR multiplication)
    canvasWidth: number;
    canvasHeight: number;
    pr: number;
    // Camera state
    cameraX: number;
    cameraY: number;
    cameraZoom: number;
    cameraViewWidth: number;
    cameraViewHeight: number;
    // World boundary
    worldWidth: number;
    worldHeight: number;
    // Building positions: Float32Array [x, y, x, y, ...]
    validBuildingsBuffer: Float32Array;
    validBuildingsCount: number;
    invalidBuildingsBuffer: Float32Array;
    invalidBuildingsCount: number;
    // Territory radius
    territoryRadius: number;
    // Colors (CSS color strings)
    validColor: string;
    invalidColor: string;
}

/** Actual world-space bounds covered by the rendered Worker bitmap */
export interface WorkerRenderBufferBounds {
    bufferLeft: number;
    bufferTop: number;
    bufferWorldWidth: number;
    bufferWorldHeight: number;
}

/**
 * Frame metadata consumed by main-thread renderers.
 * Buffer bounds come from the Worker result, camera state comes from the original request.
 */
export interface WorkerBitmapFrameMeta extends WorkerRenderBufferBounds {
    cameraX: number;
    cameraY: number;
    cameraZoom: number;
}

// ---------------------------------------------------------------------------
// Request (Main → Worker)
// ---------------------------------------------------------------------------

export type WorkerRequest =
    | { type: 'INIT'; id: number; payload: InitPayload }
    | { type: 'FOG_REBUILD_STATIC'; id: number; payload: FogRebuildStaticPayload }
    | { type: 'TERRITORY_REBUILD'; id: number; payload: TerritoryRebuildPayload };

// ---------------------------------------------------------------------------
// Response (Worker → Main)
// ---------------------------------------------------------------------------

export type WorkerResponse =
    | { type: 'READY'; id: number }
    | { type: 'RESULT'; id: number; ok: true; bitmap: ImageBitmap; bufferBounds: WorkerRenderBufferBounds; playerId?: string }
    | { type: 'RESULT'; id: number; ok: false; taskType: 'fog' | 'territory'; playerId?: string; message: string };
