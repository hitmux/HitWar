/**
 * Worker rendering module — public API
 *
 * Provides everything needed to offload fog/territory rendering to a Web Worker:
 * - Bridge lifecycle (init, dispose)
 * - Capability detection
 * - Payload packing utilities
 * - Type exports
 */

export { RenderWorkerBridge } from './bridge';
export { detectWorkerRenderingSupport, resetCapabilityCache } from './capabilityDetect';
export { packVisionSources, packBuildingPositions } from './payloadPacker';
export type {
    WorkerRequest,
    WorkerResponse,
    FogRebuildStaticPayload,
    TerritoryRebuildPayload,
    InitPayload,
} from './types';
export type {
    PackedVisionSources,
    PackedBuildingPositions,
    VisionSourceLike,
    BuildingLike,
} from './payloadPacker';

export { initWorkerRendering, disposeWorkerRendering } from './init';