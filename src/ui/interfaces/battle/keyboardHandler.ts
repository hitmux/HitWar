/**
 * Keyboard handler - handles keyboard shortcuts for battle mode
 */

import { World } from '../../../game/world';

const HOLD_THRESHOLD = 200;  // ms to distinguish tap from hold
const BOOST_SPEED = 3;       // Speed multiplier when holding

export interface KeyboardHandlerCallbacks {
    togglePause: () => void;
    getIsGamePause: () => boolean;
}

export class KeyboardHandler {
    private world: World;
    private callbacks: KeyboardHandlerCallbacks;
    private speedBoostIndicator: HTMLElement;

    private isSpaceHeld: boolean = false;
    private spaceHoldTimer: ReturnType<typeof setTimeout> | null = null;
    private originalSpeed: number | null = null;
    private isAttached: boolean = false;

    // Bound handlers for removal
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundKeyUp: (e: KeyboardEvent) => void;

    constructor(world: World, callbacks: KeyboardHandlerCallbacks) {
        this.world = world;
        this.callbacks = callbacks;
        this.speedBoostIndicator = document.getElementById("speedBoostIndicator") as HTMLElement;

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
    }

    /**
     * Attach keyboard event listeners
     */
    attach(): void {
        if (this.isAttached) return;
        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("keyup", this.boundKeyUp);
        this.isAttached = true;
    }

    /**
     * Detach keyboard event listeners and cleanup
     */
    detach(): void {
        document.removeEventListener("keydown", this.boundKeyDown);
        document.removeEventListener("keyup", this.boundKeyUp);
        if (this.spaceHoldTimer) {
            clearTimeout(this.spaceHoldTimer);
            this.spaceHoldTimer = null;
        }
        this.stopSpeedBoost();
        this.isAttached = false;
    }

    private startSpeedBoost(): void {
        if (this.callbacks.getIsGamePause()) return;
        this.isSpaceHeld = true;
        this.originalSpeed = this.world.gameSpeed;
        this.world.gameSpeed = this.originalSpeed * BOOST_SPEED;
        const textEl = this.speedBoostIndicator.querySelector(".speedBoostText");
        if (textEl) {
            textEl.textContent = `x${this.world.gameSpeed} 加速中`;
        }
        this.speedBoostIndicator.style.display = "block";
    }

    private stopSpeedBoost(): void {
        if (this.originalSpeed !== null) {
            this.world.gameSpeed = this.originalSpeed;
            this.originalSpeed = null;
        }
        this.isSpaceHeld = false;
        this.speedBoostIndicator.style.display = "none";
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        if (e.code === "Space") {
            e.preventDefault();
            if (e.repeat) return;
            this.spaceHoldTimer = setTimeout(() => {
                this.startSpeedBoost();
            }, HOLD_THRESHOLD);
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        if (e.code === "Space") {
            e.preventDefault();
            if (this.spaceHoldTimer) {
                clearTimeout(this.spaceHoldTimer);
                this.spaceHoldTimer = null;
            }
            if (this.isSpaceHeld) {
                this.stopSpeedBoost();
            } else {
                this.callbacks.togglePause();
            }
        }
    }
}
