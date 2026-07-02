/**
 * Multiplayer Game Controller
 * Simplified game loop for network-based multiplayer mode
 * Only handles rendering - game logic runs on server
 */

import type { NetworkWorldAdapter } from '../../../network/rendering/networkWorldAdapter';
import { WorldRenderer } from '../../../game/rendering/worldRenderer';

export interface MultiplayerGameCallbacks {
    onGameEnd: () => void;
    updateZoomLevel: () => void;
}

/**
 * Game controller for multiplayer mode
 * Manages the render loop without local game logic
 */
export class MultiplayerGameController {
    private _gameEnd = false;
    private _rafId: number | null = null;
    private _lastFrameTime = 0;

    private _adapter: NetworkWorldAdapter;
    private _renderer: WorldRenderer;
    private _canvasEle: HTMLCanvasElement;
    private _callbacks: MultiplayerGameCallbacks;

    constructor(
        adapter: NetworkWorldAdapter,
        renderer: WorldRenderer,
        canvasEle: HTMLCanvasElement,
        callbacks: MultiplayerGameCallbacks
    ) {
        this._adapter = adapter;
        this._renderer = renderer;
        this._canvasEle = canvasEle;
        this._callbacks = callbacks;
    }

    // === Public Accessors ===

    get gameEnd(): boolean {
        return this._gameEnd;
    }

    set gameEnd(value: boolean) {
        this._gameEnd = value;
    }

    // === Lifecycle ===

    /**
     * Start the render loop
     */
    start(): void {
        this._lastFrameTime = performance.now();
        this._rafId = requestAnimationFrame(this._mainLoop);
    }

    /**
     * Stop the render loop and cleanup
     */
    stop(): void {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._callbacks.onGameEnd();
    }

    /**
     * Request a re-render (for UI interactions during pause)
     */
    requestRender(): void {
        // In multiplayer mode, always rendering so no-op
    }

    // === Private Methods ===

    /**
     * Main render loop
     */
    private _mainLoop = (now: number): void => {
        if (this._gameEnd) {
            this.stop();
            return;
        }

        // Calculate delta time (capped to avoid spiral of death)
        const dt = Math.min(now - this._lastFrameTime, 200);
        this._lastFrameTime = now;

        // Update adapter (sync state, interpolation, effects)
        this._adapter.update(dt);

        // Render
        this._renderer.render(this._canvasEle);
        this._callbacks.updateZoomLevel();

        // Schedule next frame
        this._rafId = requestAnimationFrame(this._mainLoop);
    };
}
