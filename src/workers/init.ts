/**
 * Worker rendering initialization
 *
 * Sets up the RenderWorkerBridge, detects capabilities,
 * and wires bridge callbacks to FogRenderer / TerritoryRenderer.
 *
 * Usage:
 *   import { initWorkerRendering, disposeWorkerRendering } from '@/workers';
 *   initWorkerRendering(fogOfWar);  // after FogOfWar is created
 *   disposeWorkerRendering();       // on game cleanup
 */

import { RenderWorkerBridge } from './bridge';
import { detectWorkerRenderingSupport } from './capabilityDetect';
import type { FogOfWar } from '../systems/fog';
import type { Territory } from '../systems/territory';

/** Singleton bridge instance (null if Worker rendering is unsupported or not initialized) */
let _bridge: RenderWorkerBridge | null = null;

/**
 * Initialize Worker rendering pipeline.
 *
 * If the browser supports OffscreenCanvas + transferToImageBitmap,
 * creates a Worker, performs INIT handshake, and wires the fog/territory
 * bitmap callbacks to their respective renderers.
 *
 * Falls back gracefully: if capability detection fails, nothing happens
 * and the main-thread rendering path is used as-is.
 */
export function initWorkerRendering(fog: FogOfWar, territories?: Territory[]): void {
    if (!detectWorkerRenderingSupport()) {
        console.info('[WorkerRendering] Browser does not support OffscreenCanvas Worker rendering — using main thread fallback.');
        return;
    }

    const bridge = new RenderWorkerBridge();
    _bridge = bridge;

    // Wire fog bitmap callback to FogRenderer
    bridge.fogBitmapCallback = (bitmap: ImageBitmap, frameMeta) => {
        fog.renderer.setWorkerBitmap(bitmap, frameMeta);
    };

    // Wire territory bitmap callback to correct TerritoryRenderer
    bridge.territoryBitmapCallback = (playerId: string, bitmap: ImageBitmap, frameMeta) => {
        if (!territories) return;
        for (const territory of territories) {
            if (territory.playerId === playerId || (territory.playerId === null && playerId === '')) {
                territory.renderer.setWorkerBitmap(bitmap, frameMeta);
                return;
            }
        }
    };

    // On crash: fall back to main-thread rendering for all renderers
    bridge.onFallback = () => {
        fog.renderer.disableWorkerMode();
        if (territories) {
            for (const territory of territories) {
                territory.renderer.disableWorkerMode();
            }
        }
    };

    // On successful INIT handshake: enable Worker mode for all renderers
    bridge.onReady = () => {
        fog.renderer.enableWorkerMode(bridge);
        if (territories) {
            for (const territory of territories) {
                territory.renderer.enableWorkerMode(bridge);
            }
        }
    };

    // Start Worker lifecycle
    bridge.init();

    console.info('[WorkerRendering] Initialized — fog and territory rendering offloaded to Worker.');
}

/**
 * Dispose Worker rendering pipeline.
 * Call on game cleanup / page unload.
 */
export function disposeWorkerRendering(): void {
    if (_bridge) {
        _bridge.dispose();
        _bridge = null;
    }
}

/**
 * Get the current bridge instance (for testing or advanced usage).
 */
export function getBridge(): RenderWorkerBridge | null {
    return _bridge;
}
