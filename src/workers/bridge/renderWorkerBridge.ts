/**
 * RenderWorkerBridge — Main thread interface to RenderWorker
 *
 * Responsibilities:
 * - Worker lifecycle (spawn, terminate, crash recovery)
 * - Backpressure: fog = 1 inflight + 1 pending; territory = per-player
 * - Error recovery: crash → onFallback → 1s → respawn
 * - Callback dispatch: fog bitmap, territory bitmap, ready, fallback
 */

import type {
    WorkerRequest,
    WorkerResponse,
    FogRebuildStaticPayload,
    TerritoryRebuildPayload,
} from '../types';

type SentRequestMeta = { taskType: 'fog' | 'territory'; playerId?: string };

export class RenderWorkerBridge {
    private _worker: Worker | null = null;
    private _ready = false;
    private _nextId = 0;
    private _disposed = false;

    // Track sent requests for accurate error routing
    private _sentRequests = new Map<number, SentRequestMeta>();

    // Backpressure: fog (single global slot)
    private _fogInFlight = false;
    private _fogPendingPayload: FogRebuildStaticPayload | null = null;

    // Backpressure: territory (per-player slot)
    private _territoryInFlight = new Map<string, boolean>();
    private _territoryPendingMap = new Map<string, TerritoryRebuildPayload>();

    // ---------------------------------------------------------------------------
    // Public callbacks
    // ---------------------------------------------------------------------------

    /** Called when Worker is ready (initial or after crash recovery) */
    onReady: (() => void) | null = null;

    /** Called when Worker crashes; renderer should switch back to main-thread mode */
    onFallback: (() => void) | null = null;

    /** Called with the new static fog bitmap after each successful rebuild */
    fogBitmapCallback: ((bitmap: ImageBitmap) => void) | null = null;

    /** Called with the new territory bitmap after each successful rebuild */
    territoryBitmapCallback: ((playerId: string, bitmap: ImageBitmap) => void) | null = null;

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    get isReady(): boolean {
        return this._ready;
    }

    /** Spawn Worker and begin INIT handshake */
    init(): void {
        this._spawnWorker();
    }

    private _spawnWorker(): void {
        if (this._disposed) return;

        const worker = new Worker(
            new URL('../core/renderWorker.ts', import.meta.url),
            { type: 'module' }
        );
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => this._handleResponse(e.data);
        worker.onerror = (e: ErrorEvent) => this._handleCrash(e);
        this._worker = worker;

        // INIT handshake — no transfer needed
        const id = this._nextId++;
        const req: WorkerRequest = { type: 'INIT', id, payload: {} };
        worker.postMessage(req);
    }

    dispose(): void {
        this._disposed = true;
        this._worker?.terminate();
        this._worker = null;
        this._ready = false;
        this._fogInFlight = false;
        this._fogPendingPayload = null;
        this._territoryInFlight.clear();
        this._territoryPendingMap.clear();
        this._sentRequests.clear();
    }

    // ---------------------------------------------------------------------------
    // Public request API
    // ---------------------------------------------------------------------------

    /**
     * Request fog static layer rebuild.
     * Backpressure: at most 1 inflight + 1 pending (new pending drops old).
     * Buffers in payload WILL be transferred — do not reuse them after calling this.
     */
    requestFogRebuild(payload: FogRebuildStaticPayload): void {
        if (!this._ready) {
            // Queue for after READY
            this._fogPendingPayload = payload;
            return;
        }
        this._doFogRebuild(payload);
    }

    /**
     * Request territory layer rebuild for a specific player.
     * Backpressure: at most 1 inflight + 1 pending per player.
     * Buffers in payload WILL be transferred — do not reuse them after calling this.
     */
    requestTerritoryRebuild(payload: TerritoryRebuildPayload): void {
        if (!this._ready) {
            this._territoryPendingMap.set(payload.playerId, payload);
            return;
        }
        this._doTerritoryRebuild(payload);
    }

    // ---------------------------------------------------------------------------
    // Internal: send
    // ---------------------------------------------------------------------------

    private _doFogRebuild(payload: FogRebuildStaticPayload): void {
        if (this._fogInFlight) {
            this._fogPendingPayload = payload; // Overwrite — drop stale pending
            return;
        }
        this._fogInFlight = true;
        this._fogPendingPayload = null;

        const id = this._nextId++;
        this._sentRequests.set(id, { taskType: 'fog' });
        const req: WorkerRequest = { type: 'FOG_REBUILD_STATIC', id, payload };
        // Transfer visionSourcesBuffer — zero-copy
        this._worker!.postMessage(req, [payload.visionSourcesBuffer.buffer]);
    }

    private _doTerritoryRebuild(payload: TerritoryRebuildPayload): void {
        const { playerId } = payload;
        if (this._territoryInFlight.get(playerId)) {
            this._territoryPendingMap.set(playerId, payload); // Overwrite
            return;
        }
        this._territoryInFlight.set(playerId, true);
        this._territoryPendingMap.delete(playerId);

        const id = this._nextId++;
        this._sentRequests.set(id, { taskType: 'territory', playerId });
        const req: WorkerRequest = { type: 'TERRITORY_REBUILD', id, payload };
        // Transfer both building position buffers — zero-copy
        this._worker!.postMessage(req, [
            payload.validBuildingsBuffer.buffer,
            payload.invalidBuildingsBuffer.buffer,
        ]);
    }

    // ---------------------------------------------------------------------------
    // Internal: receive
    // ---------------------------------------------------------------------------

    private _handleResponse(res: WorkerResponse): void {
        switch (res.type) {
            case 'READY': {
                this._ready = true;
                this.onReady?.();
                // Flush any payloads queued before READY or after crash
                this._flushPendingFog();
                this._flushAllPendingTerritories();
                break;
            }

            case 'RESULT': {
                this._sentRequests.delete(res.id);

                if (!res.ok) {
                    console.warn('[RenderWorkerBridge] task error:', res.message);
                    if (res.taskType === 'fog') {
                        this._fogInFlight = false;
                        this._flushPendingFog();
                    } else if (res.playerId !== undefined) {
                        this._territoryInFlight.delete(res.playerId);
                        this._flushPendingTerritory(res.playerId);
                    }
                    return;
                }

                if (res.playerId !== undefined) {
                    // Territory bitmap
                    this._territoryInFlight.delete(res.playerId);
                    this.territoryBitmapCallback?.(res.playerId, res.bitmap);
                    this._flushPendingTerritory(res.playerId);
                } else {
                    // Fog bitmap
                    this._fogInFlight = false;
                    this.fogBitmapCallback?.(res.bitmap);
                    this._flushPendingFog();
                }
                break;
            }
        }
    }

    private _handleCrash(e: ErrorEvent): void {
        console.error('[RenderWorkerBridge] Worker crashed, falling back to main thread:', e.message);
        this._ready = false;
        this._fogInFlight = false;
        this._territoryInFlight.clear();
        this._sentRequests.clear();
        this._worker?.terminate();
        this._worker = null;

        // NOTE: _fogPendingPayload and _territoryPendingMap are intentionally NOT
        // cleared here. After respawn, _flushPending* will retry them. This trades
        // a potential stale frame (if the game state changed significantly) for
        // avoiding a dropped frame on recovery. Acceptable because stale territory/
        // fog data is visually harmless and quickly replaced by the next update.

        // Notify renderers to switch back to main-thread mode
        this.onFallback?.();

        // Attempt to respawn after 1s
        setTimeout(() => this._spawnWorker(), 1000);
    }

    // ---------------------------------------------------------------------------
    // Internal: flush pending
    // ---------------------------------------------------------------------------

    private _flushPendingFog(): void {
        if (this._fogPendingPayload) {
            const payload = this._fogPendingPayload;
            this._fogPendingPayload = null;
            this._doFogRebuild(payload);
        }
    }

    private _flushPendingTerritory(playerId: string): void {
        const pending = this._territoryPendingMap.get(playerId);
        if (pending) {
            this._territoryPendingMap.delete(playerId);
            this._doTerritoryRebuild(pending);
        }
    }

    private _flushAllPendingTerritories(): void {
        const playerIds = [...this._territoryPendingMap.keys()];
        for (const playerId of playerIds) {
            const payload = this._territoryPendingMap.get(playerId);
            if (payload) {
                this._territoryPendingMap.delete(playerId);
                this._doTerritoryRebuild(payload);
            }
        }
    }
}
