import { describe, expect, it, vi } from 'vitest';
import type { Camera } from '../camera';
import { InputHandler } from './inputHandler';

interface FakeTouch {
    clientX: number;
    clientY: number;
}

function touchEvent(touches: FakeTouch[]): TouchEvent {
    return {
        touches: touches as unknown as TouchList,
        preventDefault: vi.fn(),
    } as unknown as TouchEvent;
}

function canvas() {
    return {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
    } as unknown as HTMLCanvasElement;
}

function camera(): Camera {
    return {
        x: 0,
        y: 0,
        zoom: 1,
        minZoom: 0.1,
        maxZoom: 2,
        viewWidth: 200,
        viewHeight: 100,
        worldWidth: 1000,
        worldHeight: 1000,
        pan(this: Camera, dx: number, dy: number) {
            this.x -= dx / this.zoom;
            this.y -= dy / this.zoom;
        },
        zoomAt(this: Camera, factor: number) {
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        },
    } as unknown as Camera;
}

describe('InputHandler touch gestures', () => {
    it('keeps touch listeners disabled by default', () => {
        const element = canvas();
        new InputHandler(camera(), element);

        expect(element.addEventListener).not.toHaveBeenCalledWith(
            'touchstart',
            expect.any(Function),
            expect.anything(),
        );
    });

    it('pans the camera with a single-finger drag and marks it as dragging', () => {
        const element = canvas();
        const handler = new InputHandler(camera(), element, { touchEnabled: true });

        handler.onTouchStart(touchEvent([{ clientX: 100, clientY: 40 }]));
        handler.onTouchMove(touchEvent([{ clientX: 50, clientY: 40 }]));
        handler.onTouchEnd(touchEvent([]));

        expect(handler.camera.x).toBe(50);
        expect(handler.wasDragging()).toBe(true);
    });

    it('zooms around the midpoint during a two-finger pinch', () => {
        const handler = new InputHandler(
            camera(),
            canvas(),
            { touchEnabled: true },
        );

        handler.onTouchStart(touchEvent([
            { clientX: 50, clientY: 50 },
            { clientX: 150, clientY: 50 },
        ]));
        handler.onTouchMove(touchEvent([
            { clientX: 25, clientY: 50 },
            { clientX: 175, clientY: 50 },
        ]));
        handler.onTouchEnd(touchEvent([]));

        expect(handler.camera.zoom).toBeCloseTo(1.5);
        expect(handler.wasDragging()).toBe(true);
    });

    it('does not mark a tap as a drag so the canvas click can continue', () => {
        const handler = new InputHandler(
            camera(),
            canvas(),
            { touchEnabled: true },
        );

        handler.onTouchStart(touchEvent([{ clientX: 100, clientY: 40 }]));
        handler.onTouchEnd(touchEvent([]));

        expect(handler.wasDragging()).toBe(false);
    });

    it('resets a cancelled gesture and removes touch listeners on destroy', () => {
        const element = canvas();
        const handler = new InputHandler(camera(), element, { touchEnabled: true });
        handler.onTouchStart(touchEvent([
            { clientX: 50, clientY: 50 },
            { clientX: 150, clientY: 50 },
        ]));
        handler.onTouchCancel(touchEvent([]));

        expect(handler.wasDragging()).toBe(false);
        handler.destroy();
        expect(element.removeEventListener).toHaveBeenCalledWith(
            'touchcancel',
            expect.any(Function),
        );
    });
});
