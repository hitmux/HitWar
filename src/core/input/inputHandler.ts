/**
 * InputHandler - Manages map dragging and zooming
 */
import { Vector } from '../math/vector';
import type { Camera } from '../camera';

interface BoundHandlers {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    mouseleave: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
    touchstart: (e: TouchEvent) => void;
    touchmove: (e: TouchEvent) => void;
    touchend: (e: TouchEvent) => void;
    touchcancel: (e: TouchEvent) => void;
}

export interface InputHandlerOptions {
    /** Enable touch gestures for this input handler. Disabled by default. */
    touchEnabled?: boolean;
}

export class InputHandler {
    camera: Camera;
    canvas: HTMLCanvasElement;

    isDragging: boolean;
    dragStartPos: Vector | null;
    lastMousePos: Vector | null;
    dragTotalDistance: number;

    dragThreshold: number;

    private _wasDragging: boolean;
    private _wasDraggingTimestamp: number;
    private _wasDraggingTimeout: number;

    zoomStep: number;

    private _boundHandlers: BoundHandlers | null;

    private readonly touchEnabled: boolean;
    private touchStartPos: Vector | null = null;
    private lastTouchPos: Vector | null = null;
    private touchTotalDistance = 0;
    private pinchActive = false;
    private pinchLastDistance = 0;
    private pinchLastMidpoint: Vector | null = null;

    onRenderRequest: (() => void) | null;

    constructor(camera: Camera, canvas: HTMLCanvasElement, options: InputHandlerOptions = {}) {
        this.camera = camera;
        this.canvas = canvas;
        this.touchEnabled = options.touchEnabled === true;

        this.isDragging = false;
        this.dragStartPos = null;
        this.lastMousePos = null;
        this.dragTotalDistance = 0;

        this.dragThreshold = 5;

        this._wasDragging = false;
        this._wasDraggingTimestamp = 0;
        this._wasDraggingTimeout = 500;

        this.zoomStep = 0.1;

        this._boundHandlers = null;

        this.onRenderRequest = null;

        this._bindEvents();
    }

    /**
     * Bind events
     */
    private _bindEvents(): void {
        this._boundHandlers = {
            mousedown: (e: MouseEvent) => this.onMouseDown(e),
            mousemove: (e: MouseEvent) => this.onMouseMove(e),
            mouseup: (e: MouseEvent) => this.onMouseUp(e),
            mouseleave: (e: MouseEvent) => this.onMouseUp(e),
            wheel: (e: WheelEvent) => this.onWheel(e),
            touchstart: (e: TouchEvent) => this.onTouchStart(e),
            touchmove: (e: TouchEvent) => this.onTouchMove(e),
            touchend: (e: TouchEvent) => this.onTouchEnd(e),
            touchcancel: (e: TouchEvent) => this.onTouchCancel(e)
        };

        this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
        this.canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });

        if (this.touchEnabled) {
            this.canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
            this.canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
            this.canvas.addEventListener('touchend', this._boundHandlers.touchend, { passive: false });
            this.canvas.addEventListener('touchcancel', this._boundHandlers.touchcancel, { passive: false });
        }
    }

    /**
     * Remove all event listeners
     */
    destroy(): void {
        if (this._boundHandlers) {
            this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
            this.canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
            this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
            this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
            this.canvas.removeEventListener('wheel', this._boundHandlers.wheel);
            if (this.touchEnabled) {
                this.canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
                this.canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
                this.canvas.removeEventListener('touchend', this._boundHandlers.touchend);
                this.canvas.removeEventListener('touchcancel', this._boundHandlers.touchcancel);
            }
            this._boundHandlers = null;
        }
        this.resetState();
    }

    /**
     * Get mouse position relative to canvas
     */
    private _getMousePos(e: MouseEvent): Vector {
        return this._getClientPos(e.clientX, e.clientY);
    }

    private _getClientPos(clientX: number, clientY: number): Vector {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector(clientX - rect.left, clientY - rect.top);
    }

    /**
     * Mouse down event
     */
    onMouseDown(e: MouseEvent): void {
        if (e.button !== 0) return;

        this.isDragging = true;
        this.dragStartPos = this._getMousePos(e);
        this.lastMousePos = this.dragStartPos.copy();
        this.dragTotalDistance = 0;
        this._wasDragging = false;
    }

    /**
     * Mouse move event
     */
    onMouseMove(e: MouseEvent): void {
        if (!this.isDragging) return;

        const currentPos = this._getMousePos(e);

        const dx = currentPos.x - this.lastMousePos!.x;
        const dy = currentPos.y - this.lastMousePos!.y;

        this.dragTotalDistance += Math.sqrt(dx * dx + dy * dy);

        this.camera.pan(dx, dy);

        this.lastMousePos = currentPos;

        if (this.onRenderRequest) this.onRenderRequest();
    }

    /**
     * Mouse up event
     */
    onMouseUp(e: MouseEvent): void {
        if (!this.isDragging) return;

        this._wasDragging = this.dragTotalDistance >= this.dragThreshold;
        if (this._wasDragging) {
            this._wasDraggingTimestamp = Date.now();
        }

        this.isDragging = false;
        this.dragStartPos = null;
        this.lastMousePos = null;
    }

    /**
     * Wheel event (zoom)
     */
    onWheel(e: WheelEvent): void {
        e.preventDefault();

        const mousePos = this._getMousePos(e);

        const factor = e.deltaY > 0 ? (1 - this.zoomStep) : (1 + this.zoomStep);

        this.camera.zoomAt(factor, mousePos);

        if (this.onRenderRequest) this.onRenderRequest();
    }

    /** Touch start: begin a one-finger pan or a two-finger pinch gesture. */
    onTouchStart(e: TouchEvent): void {
        if (!this.touchEnabled || e.touches.length === 0) return;

        if (e.touches.length >= 2) {
            e.preventDefault();
            this.pinchActive = true;
            this._wasDragging = true;
            this._wasDraggingTimestamp = Date.now();
            this.pinchLastDistance = this._touchDistance(e.touches[0], e.touches[1]);
            this.pinchLastMidpoint = this._touchMidpoint(e.touches[0], e.touches[1]);
            return;
        }

        const touch = e.touches[0];
        this.touchStartPos = this._getClientPos(touch.clientX, touch.clientY);
        this.lastTouchPos = this.touchStartPos.copy();
        this.touchTotalDistance = 0;
        this.pinchActive = false;
        this.pinchLastDistance = 0;
        this.pinchLastMidpoint = null;
        this._wasDragging = false;
    }

    /** Touch move: pan with one finger and pan/zoom around the midpoint with two. */
    onTouchMove(e: TouchEvent): void {
        if (!this.touchEnabled || e.touches.length === 0) return;

        if (e.touches.length >= 2) {
            e.preventDefault();
            const midpoint = this._touchMidpoint(e.touches[0], e.touches[1]);
            const distance = this._touchDistance(e.touches[0], e.touches[1]);

            if (!this.pinchActive || !this.pinchLastMidpoint || this.pinchLastDistance <= 0) {
                this.pinchActive = true;
                this.pinchLastDistance = distance;
                this.pinchLastMidpoint = midpoint;
                this._wasDragging = true;
                this._wasDraggingTimestamp = Date.now();
                return;
            }

            this.camera.pan(
                midpoint.x - this.pinchLastMidpoint.x,
                midpoint.y - this.pinchLastMidpoint.y
            );
            if (distance > 0) {
                this.camera.zoomAt(distance / this.pinchLastDistance, midpoint);
            }
            this.pinchLastDistance = distance;
            this.pinchLastMidpoint = midpoint;
            this._wasDragging = true;
            this._wasDraggingTimestamp = Date.now();
            this.onRenderRequest?.();
            return;
        }

        if (this.pinchActive || !this.lastTouchPos) return;

        const touch = e.touches[0];
        const currentPos = this._getClientPos(touch.clientX, touch.clientY);
        const dx = currentPos.x - this.lastTouchPos.x;
        const dy = currentPos.y - this.lastTouchPos.y;
        this.touchTotalDistance += Math.sqrt(dx * dx + dy * dy);

        if (dx !== 0 || dy !== 0) {
            this.camera.pan(dx, dy);
            this.lastTouchPos = currentPos;
            if (this.touchTotalDistance >= this.dragThreshold) {
                this._wasDragging = true;
                this._wasDraggingTimestamp = Date.now();
                e.preventDefault();
            }
            this.onRenderRequest?.();
        }
    }

    /** Finish a touch gesture while preserving the click-after-tap behavior. */
    onTouchEnd(e: TouchEvent): void {
        if (!this.touchEnabled) return;
        if (e.touches.length > 0) {
            // A pinch ending with one finger must never become a canvas click.
            if (this.pinchActive) {
                this._wasDragging = true;
                this._wasDraggingTimestamp = Date.now();
                e.preventDefault();
            }
            return;
        }

        const wasGesture = this.pinchActive || this.touchTotalDistance >= this.dragThreshold;
        if (wasGesture) {
            this._wasDragging = true;
            this._wasDraggingTimestamp = Date.now();
            // Prevent the browser's synthetic click after a pan or pinch.
            e.preventDefault();
        }
        this.touchStartPos = null;
        this.lastTouchPos = null;
        this.touchTotalDistance = 0;
        this.pinchActive = false;
        this.pinchLastDistance = 0;
        this.pinchLastMidpoint = null;
    }

    /** Cancelled touches must not leak gesture state into the next interaction. */
    onTouchCancel(_e: TouchEvent): void {
        if (!this.touchEnabled) return;
        this.touchStartPos = null;
        this.lastTouchPos = null;
        this.touchTotalDistance = 0;
        this.pinchActive = false;
        this.pinchLastDistance = 0;
        this.pinchLastMidpoint = null;
        this._wasDragging = false;
        this._wasDraggingTimestamp = 0;
    }

    private _touchDistance(first: Touch, second: Touch): number {
        return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    }

    private _touchMidpoint(first: Touch, second: Touch): Vector {
        return this._getClientPos(
            (first.clientX + second.clientX) / 2,
            (first.clientY + second.clientY) / 2
        );
    }

    /**
     * Zoom in (button call)
     */
    zoomIn(): void {
        const center = new Vector(this.camera.viewWidth / 2, this.camera.viewHeight / 2);
        this.camera.zoomAt(1 + this.zoomStep, center);

        if (this.onRenderRequest) this.onRenderRequest();
    }

    /**
     * Zoom out (button call)
     */
    zoomOut(): void {
        const center = new Vector(this.camera.viewWidth / 2, this.camera.viewHeight / 2);
        this.camera.zoomAt(1 - this.zoomStep, center);

        if (this.onRenderRequest) this.onRenderRequest();
    }

    /**
     * Check if the last mouse operation was a drag
     */
    wasDragging(): boolean {
        if (this._wasDragging && Date.now() - this._wasDraggingTimestamp > this._wasDraggingTimeout) {
            this._wasDragging = false;
        }
        const result = this._wasDragging;
        this._wasDragging = false;
        return result;
    }

    /**
     * Force reset all dragging state
     */
    resetState(): void {
        this.isDragging = false;
        this._wasDragging = false;
        this._wasDraggingTimestamp = 0;
        this.dragStartPos = null;
        this.lastMousePos = null;
        this.dragTotalDistance = 0;
        this.touchStartPos = null;
        this.lastTouchPos = null;
        this.touchTotalDistance = 0;
        this.pinchActive = false;
        this.pinchLastDistance = 0;
        this.pinchLastMidpoint = null;
    }
}
