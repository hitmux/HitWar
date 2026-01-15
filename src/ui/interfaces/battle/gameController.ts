/**
 * Game controller - handles game loop, performance degradation, and auto-save
 */

import { World } from '../../../game/world';
import { SaveManager } from '../../../systems/save/saveManager';
import { SaveUI } from '../../../systems/save/saveUI';
import type { CanvasWithInputHandler, LoopGuardState, DegradationParams } from './types';

const BASE_STEP_MS = 25;

// Default loop guard configuration
const DEFAULT_LOOP_GUARD: LoopGuardState = {
    consecutiveOverload: 0,
    overloadThreshold: 30,
    recoveryThreshold: 60,
    consecutiveNormal: 0,
    degradationLevel: 0,
    maxDegradation: 2,
    lastWarningTime: 0,
    warningCooldown: 5000,
};

// Degradation parameters: [maxStepsMultiplier, stepMultiplier]
const DEGRADATION_PARAMS: DegradationParams = [
    [1, 1],       // Level 0: normal
    [0.75, 1.2],  // Level 1: maxSteps to 75%, step +20%
    [0.5, 1.5],   // Level 2: maxSteps to 50%, step +50%
];

export interface GameControllerCallbacks {
    onGameEnd: () => void;
    onFailure: () => void;
    updateZoomLevel: () => void;
}

export class GameController {
    private world: World;
    private canvasEle: CanvasWithInputHandler;
    private mode: string;
    private haveGroup: boolean;
    private callbacks: GameControllerCallbacks;

    // State flags
    private _gameEnd: boolean = false;
    private _isGamePause: boolean = false;
    private pauseNeedsRender: boolean = false;

    // Loop state
    private accumulator: number = 0;
    private lastFrameTime: number = 0;
    private rafId: number | null = null;
    private loopGuard: LoopGuardState = { ...DEFAULT_LOOP_GUARD };

    // Auto-save
    private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
    private hasShownAutoSaveIndicator: boolean = false;

    constructor(
        world: World,
        canvasEle: CanvasWithInputHandler,
        mode: string,
        haveGroup: boolean,
        callbacks: GameControllerCallbacks
    ) {
        this.world = world;
        this.canvasEle = canvasEle;
        this.mode = mode;
        this.haveGroup = haveGroup;
        this.callbacks = callbacks;
    }

    get gameEnd(): boolean {
        return this._gameEnd;
    }

    set gameEnd(value: boolean) {
        this._gameEnd = value;
    }

    get isGamePause(): boolean {
        return this._isGamePause;
    }

    set isGamePause(value: boolean) {
        this._isGamePause = value;
    }

    /**
     * Request a render on next pause frame
     */
    requestPauseRender(): void {
        if (this._isGamePause) {
            this.pauseNeedsRender = true;
        }
    }

    /**
     * Request render callback for external use
     */
    requestRenderOnPause(): void {
        this.pauseNeedsRender = true;
        this.world.markUiDirty();
    }

    /**
     * Reset loop accumulator (call after unpausing)
     */
    resetLoopAccumulator(): void {
        this.accumulator = 0;
        this.lastFrameTime = performance.now();
        // Also reset degradation state
        this.loopGuard.consecutiveOverload = 0;
        this.loopGuard.consecutiveNormal = 0;
    }

    /**
     * Start the game loop
     */
    start(): void {
        this.startAutoSaveTimer();
        this.lastFrameTime = performance.now();
        this.rafId = requestAnimationFrame((now) => {
            this.lastFrameTime = now;
            this.mainLoop(now);
        });
    }

    /**
     * Stop the game loop and cleanup
     */
    stop(): void {
        this._gameEnd = true;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    private startAutoSaveTimer(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        this.autoSaveTimer = setInterval(() => {
            if (!this._isGamePause && !this._gameEnd) {
                const saveData = SaveManager.serialize(this.world as any);
                SaveManager.saveToLocal(this.mode, this.haveGroup, saveData);
                if (!this.hasShownAutoSaveIndicator) {
                    SaveUI.showAutoSaveIndicator();
                    this.hasShownAutoSaveIndicator = true;
                }
            }
        }, 6000);
    }

    private showPerformanceWarning(level: number): void {
        const now = performance.now();
        if (now - this.loopGuard.lastWarningTime < this.loopGuard.warningCooldown) return;
        this.loopGuard.lastWarningTime = now;

        const messages = [
            "",
            "⚠️ 性能警告: 已启用轻度降级模式",
            "⚠️ 性能警告: 已启用重度降级模式"
        ];
        if (level > 0) {
            console.warn(`[LoopGuard] ${messages[level]}, consecutiveOverload=${this.loopGuard.consecutiveOverload}`);
        }
    }

    private mainLoop = (now: number): void => {
        if (this._gameEnd) {
            this.callbacks.onGameEnd();
            if (this.rafId !== null) {
                cancelAnimationFrame(this.rafId);
            }
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }
            return;
        }

        const delta = Math.min(now - this.lastFrameTime, 200);
        this.lastFrameTime = now;

        if (!this._isGamePause) {
            // Get current degradation parameters
            const [maxStepsMult, stepMult] = DEGRADATION_PARAMS[this.loopGuard.degradationLevel];
            // Allow real slow-motion speeds (e.g. x0.5). Still guard against zero/negative values.
            const speed = Math.max(0.1, this.world.gameSpeed);
            const step = (BASE_STEP_MS / speed) * stepMult;
            this.accumulator += delta;
            let steps = 0;
            // Max steps mainly matters when speed is high (catch-up). For slow speeds (<1),
            // keeping the minimum at 1 avoids overly small ceilings while still preventing spiral of death.
            const baseMaxSteps = 8 * Math.max(1, speed);
            const maxSteps = Math.max(2, Math.floor(baseMaxSteps * maxStepsMult));

            while (this.accumulator >= step && steps < maxSteps) {
                this.world.goTick();
                this.accumulator -= step;
                steps++;
            }

            // Loop guard state update
            if (steps === maxSteps) {
                // Hit ceiling: clear accumulator, increment overload count
                this.accumulator = 0;
                this.loopGuard.consecutiveOverload++;
                this.loopGuard.consecutiveNormal = 0;

                // Check if need to upgrade degradation level
                if (this.loopGuard.consecutiveOverload >= this.loopGuard.overloadThreshold &&
                    this.loopGuard.degradationLevel < this.loopGuard.maxDegradation) {
                    this.loopGuard.degradationLevel++;
                    this.loopGuard.consecutiveOverload = 0;
                    this.showPerformanceWarning(this.loopGuard.degradationLevel);
                }
            } else {
                // Normal: increment normal count
                this.loopGuard.consecutiveNormal++;
                this.loopGuard.consecutiveOverload = 0;

                // Check if can recover degradation level
                if (this.loopGuard.consecutiveNormal >= this.loopGuard.recoveryThreshold &&
                    this.loopGuard.degradationLevel > 0) {
                    this.loopGuard.degradationLevel--;
                    this.loopGuard.consecutiveNormal = 0;
                    if (this.loopGuard.degradationLevel === 0) {
                        console.log("[LoopGuard] 性能已恢复正常");
                    }
                }
            }

            this.world.render(this.canvasEle);
            this.callbacks.updateZoomLevel();
        } else if (this.pauseNeedsRender) {
            this.world.render(this.canvasEle);
            this.callbacks.updateZoomLevel();
            this.pauseNeedsRender = false;
            this.accumulator = 0;
            this.lastFrameTime = now;
        }

        // Check for game failure
        if ((this.world.rootBuilding as any).isDead()) {
            SaveManager.clearSave(this.mode, this.haveGroup);
            this.callbacks.onFailure();
            if (this.rafId !== null) {
                cancelAnimationFrame(this.rafId);
            }
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }
            return;
        }

        this.rafId = requestAnimationFrame(this.mainLoop);
    };
}
