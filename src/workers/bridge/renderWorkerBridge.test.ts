import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RenderWorkerBridge } from './renderWorkerBridge';
import type {
    FogRebuildStaticPayload,
    TerritoryRebuildPayload,
    WorkerRenderBufferBounds,
    WorkerResponse,
} from '../types';

const originalWorker = globalThis.Worker;

class FakeWorker {
    static instances: FakeWorker[] = [];

    onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor(public url: URL, public options?: WorkerOptions) {
        FakeWorker.instances.push(this);
    }

    emit(response: WorkerResponse): void {
        this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
    }

    crash(message = 'boom'): void {
        this.onerror?.({ message } as ErrorEvent);
    }
}

function setWorker(value: unknown): void {
    Object.defineProperty(globalThis, 'Worker', {
        value,
        configurable: true,
        writable: true,
    });
}

function fogPayload(cameraX = 1): FogRebuildStaticPayload {
    return {
        canvasWidth: 100,
        canvasHeight: 80,
        pr: 1,
        cameraX,
        cameraY: 2,
        cameraZoom: 3,
        cameraViewWidth: 50,
        cameraViewHeight: 40,
        worldWidth: 200,
        worldHeight: 160,
        visionSourcesBuffer: new Float32Array([1, 2, 3]),
        visionSourcesCount: 1,
        fogColorR: 1,
        fogColorG: 2,
        fogColorB: 3,
        fogColorA: 0.4,
        outerGradientSize: 5,
    };
}

function territoryPayload(playerId: string, cameraX = 10): TerritoryRebuildPayload {
    return {
        playerId,
        canvasWidth: 100,
        canvasHeight: 80,
        pr: 1,
        cameraX,
        cameraY: 20,
        cameraZoom: 2,
        cameraViewWidth: 50,
        cameraViewHeight: 40,
        worldWidth: 200,
        worldHeight: 160,
        validBuildingsBuffer: new Float32Array([1, 2]),
        validBuildingsCount: 1,
        invalidBuildingsBuffer: new Float32Array([3, 4]),
        invalidBuildingsCount: 1,
        territoryRadius: 30,
        validColor: 'green',
        invalidColor: 'red',
    };
}

function bounds(): WorkerRenderBufferBounds {
    return {
        bufferLeft: 1,
        bufferTop: 2,
        bufferWorldWidth: 3,
        bufferWorldHeight: 4,
    };
}

describe('RenderWorkerBridge', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        FakeWorker.instances = [];
        setWorker(FakeWorker);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        setWorker(originalWorker);
    });

    it('spawns a module Worker and sends INIT', () => {
        const bridge = new RenderWorkerBridge();

        bridge.init();

        expect(FakeWorker.instances).toHaveLength(1);
        expect(FakeWorker.instances[0].options).toEqual({ type: 'module' });
        expect(FakeWorker.instances[0].postMessage).toHaveBeenCalledWith({ type: 'INIT', id: 0, payload: {} });
        expect(bridge.isReady).toBe(false);
    });

    it('marks ready, calls onReady, and flushes queued fog work', () => {
        const bridge = new RenderWorkerBridge();
        const onReady = vi.fn();
        bridge.onReady = onReady;
        bridge.init();
        const worker = FakeWorker.instances[0];
        const payload = fogPayload(7);

        bridge.requestFogRebuild(payload);
        worker.emit({ type: 'READY', id: 0 });

        expect(bridge.isReady).toBe(true);
        expect(onReady).toHaveBeenCalledOnce();
        expect(worker.postMessage).toHaveBeenLastCalledWith(
            { type: 'FOG_REBUILD_STATIC', id: 1, payload },
            [payload.visionSourcesBuffer.buffer]
        );
    });

    it('keeps only the latest queued fog payload before READY', () => {
        const bridge = new RenderWorkerBridge();
        bridge.init();
        const worker = FakeWorker.instances[0];
        const stale = fogPayload(1);
        const latest = fogPayload(2);

        bridge.requestFogRebuild(stale);
        bridge.requestFogRebuild(latest);
        worker.emit({ type: 'READY', id: 0 });

        expect(worker.postMessage).toHaveBeenCalledTimes(2);
        expect(worker.postMessage).toHaveBeenLastCalledWith(
            { type: 'FOG_REBUILD_STATIC', id: 1, payload: latest },
            [latest.visionSourcesBuffer.buffer]
        );
    });

    it('routes successful fog bitmaps with original camera metadata', () => {
        const bridge = new RenderWorkerBridge();
        const bitmap = {} as ImageBitmap;
        const callback = vi.fn();
        bridge.fogBitmapCallback = callback;
        bridge.init();
        const worker = FakeWorker.instances[0];
        worker.emit({ type: 'READY', id: 0 });
        bridge.requestFogRebuild(fogPayload(12));

        worker.emit({ type: 'RESULT', id: 1, ok: true, bitmap, bufferBounds: bounds() });

        expect(callback).toHaveBeenCalledWith(bitmap, {
            ...bounds(),
            cameraX: 12,
            cameraY: 2,
            cameraZoom: 3,
        });
    });

    it('applies fog backpressure and flushes the latest pending payload after RESULT', () => {
        const bridge = new RenderWorkerBridge();
        bridge.init();
        const worker = FakeWorker.instances[0];
        worker.emit({ type: 'READY', id: 0 });
        const first = fogPayload(1);
        const stale = fogPayload(2);
        const latest = fogPayload(3);

        bridge.requestFogRebuild(first);
        bridge.requestFogRebuild(stale);
        bridge.requestFogRebuild(latest);
        worker.emit({ type: 'RESULT', id: 1, ok: true, bitmap: {} as ImageBitmap, bufferBounds: bounds() });

        expect(worker.postMessage).toHaveBeenCalledTimes(3);
        expect(worker.postMessage).toHaveBeenLastCalledWith(
            { type: 'FOG_REBUILD_STATIC', id: 2, payload: latest },
            [latest.visionSourcesBuffer.buffer]
        );
    });

    it('queues territory work per player and flushes all after READY', () => {
        const bridge = new RenderWorkerBridge();
        bridge.init();
        const worker = FakeWorker.instances[0];
        const p1 = territoryPayload('p1', 1);
        const p2 = territoryPayload('p2', 2);

        bridge.requestTerritoryRebuild(p1);
        bridge.requestTerritoryRebuild(p2);
        worker.emit({ type: 'READY', id: 0 });

        expect(worker.postMessage).toHaveBeenCalledWith(
            { type: 'TERRITORY_REBUILD', id: 1, payload: p1 },
            [p1.validBuildingsBuffer.buffer, p1.invalidBuildingsBuffer.buffer]
        );
        expect(worker.postMessage).toHaveBeenCalledWith(
            { type: 'TERRITORY_REBUILD', id: 2, payload: p2 },
            [p2.validBuildingsBuffer.buffer, p2.invalidBuildingsBuffer.buffer]
        );
    });

    it('routes territory bitmaps by playerId and flushes that player pending payload', () => {
        const bridge = new RenderWorkerBridge();
        const callback = vi.fn();
        bridge.territoryBitmapCallback = callback;
        bridge.init();
        const worker = FakeWorker.instances[0];
        worker.emit({ type: 'READY', id: 0 });
        const first = territoryPayload('p1', 10);
        const latest = territoryPayload('p1', 30);
        const bitmap = {} as ImageBitmap;

        bridge.requestTerritoryRebuild(first);
        bridge.requestTerritoryRebuild(latest);
        worker.emit({ type: 'RESULT', id: 1, ok: true, playerId: 'p1', bitmap, bufferBounds: bounds() });

        expect(callback).toHaveBeenCalledWith('p1', bitmap, {
            ...bounds(),
            cameraX: 10,
            cameraY: 20,
            cameraZoom: 2,
        });
        expect(worker.postMessage).toHaveBeenLastCalledWith(
            { type: 'TERRITORY_REBUILD', id: 2, payload: latest },
            [latest.validBuildingsBuffer.buffer, latest.invalidBuildingsBuffer.buffer]
        );
    });

    it('recovers task slots after worker task errors', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const bridge = new RenderWorkerBridge();
        bridge.init();
        const worker = FakeWorker.instances[0];
        worker.emit({ type: 'READY', id: 0 });
        const first = fogPayload(1);
        const latest = fogPayload(2);

        bridge.requestFogRebuild(first);
        bridge.requestFogRebuild(latest);
        worker.emit({ type: 'RESULT', id: 1, ok: false, taskType: 'fog', message: 'failed' });

        expect(warn).toHaveBeenCalledWith('[RenderWorkerBridge] task error:', 'failed');
        expect(worker.postMessage).toHaveBeenLastCalledWith(
            { type: 'FOG_REBUILD_STATIC', id: 2, payload: latest },
            [latest.visionSourcesBuffer.buffer]
        );
    });

    it('falls back on Worker crash and respawns after delay', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const bridge = new RenderWorkerBridge();
        const fallback = vi.fn();
        bridge.onFallback = fallback;
        bridge.init();
        const worker = FakeWorker.instances[0];
        worker.emit({ type: 'READY', id: 0 });

        worker.crash('broken');
        await vi.advanceTimersByTimeAsync(1000);

        expect(error).toHaveBeenCalledWith(
            '[RenderWorkerBridge] Worker crashed, falling back to main thread:',
            'broken'
        );
        expect(fallback).toHaveBeenCalledOnce();
        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(FakeWorker.instances).toHaveLength(2);
        expect(FakeWorker.instances[1].postMessage).toHaveBeenCalledWith({ type: 'INIT', id: 1, payload: {} });
    });

    it('dispose terminates the worker and prevents respawn', async () => {
        const bridge = new RenderWorkerBridge();
        bridge.init();
        const worker = FakeWorker.instances[0];

        bridge.dispose();
        await vi.advanceTimersByTimeAsync(1000);

        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(bridge.isReady).toBe(false);
        expect(FakeWorker.instances).toHaveLength(1);
    });
});
