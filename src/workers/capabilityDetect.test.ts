import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectWorkerRenderingSupport, resetCapabilityCache } from './capabilityDetect';

const originalWorker = globalThis.Worker;
const originalOffscreenCanvas = globalThis.OffscreenCanvas;
const originalImageBitmap = globalThis.ImageBitmap;

function setGlobal(name: 'Worker' | 'OffscreenCanvas' | 'ImageBitmap', value: unknown): void {
    Object.defineProperty(globalThis, name, {
        value,
        configurable: true,
        writable: true,
    });
}

describe('detectWorkerRenderingSupport', () => {
    beforeEach(() => {
        resetCapabilityCache();
    });

    afterEach(() => {
        resetCapabilityCache();
        setGlobal('Worker', originalWorker);
        setGlobal('OffscreenCanvas', originalOffscreenCanvas);
        setGlobal('ImageBitmap', originalImageBitmap);
    });

    it('returns false when Worker is unavailable', () => {
        setGlobal('Worker', undefined);

        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('returns false when OffscreenCanvas is unavailable', () => {
        setGlobal('Worker', class FakeWorker {});
        setGlobal('OffscreenCanvas', undefined);

        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('returns false when 2d context or transfer support is missing', () => {
        setGlobal('Worker', class FakeWorker {});
        setGlobal('OffscreenCanvas', class NoContextCanvas {
            getContext() {
                return null;
            }
        });
        expect(detectWorkerRenderingSupport()).toBe(false);

        resetCapabilityCache();
        setGlobal('OffscreenCanvas', class NoTransferCanvas {
            getContext() {
                return {};
            }
        });
        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('returns false when transfer returns a non ImageBitmap object', () => {
        setGlobal('Worker', class FakeWorker {});
        setGlobal('ImageBitmap', class FakeImageBitmap {});
        setGlobal('OffscreenCanvas', class FakeOffscreenCanvas {
            constructor(_width: number, _height: number) {}
            getContext() {
                return {};
            }
            transferToImageBitmap() {
                return {};
            }
        });

        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('returns false when canvas construction throws', () => {
        setGlobal('Worker', class FakeWorker {});
        setGlobal('OffscreenCanvas', class ThrowingCanvas {
            constructor() {
                throw new Error('unsupported');
            }
        });

        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('returns true when the full bitmap pipeline is available and closes the bitmap', () => {
        const close = vi.fn();
        class FakeImageBitmap {
            close = close;
        }
        class FakeOffscreenCanvas {
            constructor(_width: number, _height: number) {}
            getContext(type: string) {
                return type === '2d' ? {} : null;
            }
            transferToImageBitmap() {
                return new FakeImageBitmap();
            }
        }

        setGlobal('Worker', class FakeWorker {});
        setGlobal('ImageBitmap', FakeImageBitmap);
        setGlobal('OffscreenCanvas', FakeOffscreenCanvas);

        expect(detectWorkerRenderingSupport()).toBe(true);
        expect(close).toHaveBeenCalledOnce();
    });

    it('caches the detection result until reset', () => {
        class FakeImageBitmap {
            close() {}
        }
        class FakeOffscreenCanvas {
            constructor(_width: number, _height: number) {}
            getContext() {
                return {};
            }
            transferToImageBitmap() {
                return new FakeImageBitmap();
            }
        }

        setGlobal('Worker', class FakeWorker {});
        setGlobal('ImageBitmap', FakeImageBitmap);
        setGlobal('OffscreenCanvas', FakeOffscreenCanvas);

        expect(detectWorkerRenderingSupport()).toBe(true);
        setGlobal('Worker', undefined);
        expect(detectWorkerRenderingSupport()).toBe(true);

        resetCapabilityCache();
        expect(detectWorkerRenderingSupport()).toBe(false);
    });

    it('resetCapabilityCache allows a failed detection to be retried', () => {
        class FakeImageBitmap {
            close() {}
        }
        class FakeOffscreenCanvas {
            constructor(_width: number, _height: number) {}
            getContext() {
                return {};
            }
            transferToImageBitmap() {
                return new FakeImageBitmap();
            }
        }

        setGlobal('Worker', undefined);
        expect(detectWorkerRenderingSupport()).toBe(false);

        resetCapabilityCache();
        setGlobal('Worker', class FakeWorker {});
        setGlobal('ImageBitmap', FakeImageBitmap);
        setGlobal('OffscreenCanvas', FakeOffscreenCanvas);

        expect(detectWorkerRenderingSupport()).toBe(true);
    });
});
