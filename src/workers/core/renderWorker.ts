/**
 * RenderWorker — Worker entry point
 * Routes incoming WorkerRequests to the appropriate task handler
 * and posts WorkerResponses back to the main thread.
 *
 * Uses relative imports only (no @/* aliases) for Worker bundling safety.
 */

import type { WorkerRequest, WorkerResponse } from '../types';
import { FogWorkerTask } from './fogWorkerTask';
import { TerritoryWorkerTask } from './territoryWorkerTask';

const fogTask = new FogWorkerTask();
const territoryTask = new TerritoryWorkerTask();

// Worker-scoped postMessage helper with proper transfer support
function reply(msg: WorkerResponse, transfer?: Transferable[]): void {
    if (transfer && transfer.length > 0) {
        self.postMessage(msg, transfer);
    } else {
        self.postMessage(msg);
    }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
    const req = event.data;

    try {
        switch (req.type) {
            case 'INIT': {
                reply({ type: 'READY', id: req.id });
                break;
            }

            case 'FOG_REBUILD_STATIC': {
                const { bitmap, bufferBounds } = await fogTask.rebuild(req.payload);
                reply(
                    { type: 'RESULT', id: req.id, ok: true, bitmap, bufferBounds },
                    [bitmap]
                );
                break;
            }

            case 'TERRITORY_REBUILD': {
                const { bitmap, bufferBounds } = await territoryTask.rebuild(req.payload);
                reply(
                    { type: 'RESULT', id: req.id, ok: true, bitmap, bufferBounds, playerId: req.payload.playerId },
                    [bitmap]
                );
                break;
            }

            default: {
                // Unknown message type — ignore safely
                const exhaustive: never = req;
                console.warn('[RenderWorker] Unknown message type:', (exhaustive as WorkerRequest).type);
                break;
            }
        }
    } catch (err) {
        if (req.type === 'FOG_REBUILD_STATIC') {
            fogTask.dispose();
        }

        const message = err instanceof Error ? err.message : String(err);

        // Determine task type and playerId for error routing
        const taskType = req.type === 'TERRITORY_REBUILD' ? 'territory' : 'fog';
        const playerId = req.type === 'TERRITORY_REBUILD' ? req.payload.playerId : undefined;

        reply({ type: 'RESULT', id: req.id, ok: false, taskType, playerId, message });
    }
};
