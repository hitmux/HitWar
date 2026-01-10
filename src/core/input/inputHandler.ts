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

    onRenderRequest: (() => void) | null;

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;

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
            wheel: (e: WheelEvent) => this.onWheel(e)
        };

        this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
        this.canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
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
            this._boundHandlers = null;
        }
    }

    /**
     * Get mouse position relative to canvas
     */
    private _getMousePos(e: MouseEvent): Vector {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector(e.clientX - rect.left, e.clientY - rect.top);
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
    }
}
