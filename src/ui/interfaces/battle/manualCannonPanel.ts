/**
 * ManualCannonPanel - UI panel for ManualCannon tower targeting
 *
 * Supports both single-player (direct cannon manipulation) and
 * multiplayer (network message dispatch) modes.
 */

import type { NetworkClient } from '../../../network/networkClient';
import { Vector } from '../../../core/math/vector';
import { scalePeriod } from '../../../core/speedScale';

/** Union type for cannon-like objects (real TowerManualCannon or TowerRenderProxy) */
interface CannonLike {
    id: string | null;
    currentAmmo: number;
    maxAmmo: number;
    rangeR: number;
    inValidTerritory: boolean;
    semiAutoMode: boolean;
    // Optional fields only present in single-player mode
    explosionDamage?: number;
    getDamageMultiplier?: () => number;
    reloadProgress?: number;
    reloadTime?: number;
    // Single-player local methods
    setMarkedTarget?: (pos: Vector, radius: number) => void;
    clearMarkedTarget?: () => void;
    fireAt?: (pos: Vector) => boolean;
    isValidTargetPosition?: (pos: Vector) => boolean;
}

/**
 * ManualCannonPanel class - Manages the manual cannon targeting UI
 */
export class ManualCannonPanel {
    private panelEl: HTMLElement | null = null;
    private currentCannon: CannonLike | null = null;
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private isTargetingMode: boolean = false;
    private _semiAutoSelection: boolean = false;
    private abortSignal: AbortSignal;
    private networkClient: NetworkClient | undefined;
    private onTargetCallback: ((pos: Vector) => void) | null = null;
    private onSemiAutoCallback: ((pos: Vector, radius: number) => void) | null = null;

    constructor(abortSignal: AbortSignal, networkClient?: NetworkClient) {
        this.abortSignal = abortSignal;
        this.networkClient = networkClient;
        this.createPanel();
    }

    /**
     * Create panel DOM element
     */
    private createPanel(): void {
        this.panelEl = document.createElement('div');
        this.panelEl.id = 'manualCannonPanel';
        this.panelEl.style.display = 'none';

        this.panelEl.innerHTML = `
            <div class="cannon-header">
                <span class="cannon-title">手动炮塔</span>
                <span class="cannon-close">&times;</span>
            </div>
            <div class="cannon-stats">
                <div class="cannon-stat">
                    <span class="stat-label">弹药：</span>
                    <span class="cannon-ammo">3/3</span>
                </div>
                <div class="cannon-stat">
                    <span class="stat-label">伤害：</span>
                    <span class="cannon-damage">100</span>
                </div>
                <div class="cannon-stat">
                    <span class="stat-label">射程：</span>
                    <span class="cannon-range">400</span>
                </div>
            </div>
            <div class="cannon-reload-bar">
                <div class="cannon-reload-progress"></div>
            </div>
            <div class="cannon-actions">
                <button class="cannon-btn cannon-fire-btn">瞄准射击</button>
                <button class="cannon-btn cannon-semi-btn">标记区域</button>
                <button class="cannon-btn cannon-clear-btn">清除标记</button>
            </div>
            <div class="cannon-hint"></div>
        `;

        document.body.appendChild(this.panelEl);

        // Bind close button
        const closeBtn = this.panelEl.querySelector('.cannon-close');
        closeBtn?.addEventListener('click', () => this.hide(), { signal: this.abortSignal });

        // Bind fire button
        const fireBtn = this.panelEl.querySelector('.cannon-fire-btn');
        fireBtn?.addEventListener('click', () => this.enterTargetingMode(), { signal: this.abortSignal });

        // Bind semi-auto button
        const semiBtn = this.panelEl.querySelector('.cannon-semi-btn');
        semiBtn?.addEventListener('click', () => this.enterSemiAutoMode(), { signal: this.abortSignal });

        // Bind clear button
        const clearBtn = this.panelEl.querySelector('.cannon-clear-btn');
        clearBtn?.addEventListener('click', () => this.clearSemiAuto(), { signal: this.abortSignal });
    }

    /**
     * Show panel for a cannon
     */
    show(cannon: CannonLike, screenPos: { x: number; y: number }): void {
        if (!this.panelEl) return;

        this.currentCannon = cannon;

        // Position panel
        this.panelEl.style.left = `${screenPos.x + 10}px`;
        this.panelEl.style.top = `${screenPos.y + 10}px`;
        this.panelEl.style.display = 'block';

        // Update display
        this.updateDisplay();

        // Start refresh interval
        this.startRefresh();
    }

    /**
     * Hide panel
     */
    hide(): void {
        if (!this.panelEl) return;

        this.panelEl.style.display = 'none';
        this.currentCannon = null;
        this.isTargetingMode = false;
        this.stopRefresh();
    }

    /**
     * Check if panel is visible
     */
    isVisible(): boolean {
        return this.panelEl?.style.display === 'block';
    }

    /**
     * Check if in targeting mode
     */
    isInTargetingMode(): boolean {
        return this.isTargetingMode;
    }

    /**
     * Get current cannon
     */
    getCurrentCannon(): CannonLike | null {
        return this.currentCannon;
    }

    /**
     * Update panel display
     */
    private updateDisplay(): void {
        if (!this.panelEl || !this.currentCannon) return;

        const cannon = this.currentCannon;

        // Update ammo
        const ammoEl = this.panelEl.querySelector('.cannon-ammo');
        if (ammoEl) {
            ammoEl.textContent = `${cannon.currentAmmo}/${cannon.maxAmmo}`;
        }

        // Update damage (only available in single-player mode)
        const damageEl = this.panelEl.querySelector('.cannon-damage');
        if (damageEl) {
            if (cannon.explosionDamage !== undefined && cannon.getDamageMultiplier) {
                const actualDamage = Math.round(cannon.explosionDamage * cannon.getDamageMultiplier());
                damageEl.textContent = `${actualDamage}`;
            } else {
                damageEl.textContent = '-';
            }
        }

        // Update range
        const rangeEl = this.panelEl.querySelector('.cannon-range');
        if (rangeEl) {
            rangeEl.textContent = `${cannon.rangeR}`;
        }

        // Update reload bar (only available in single-player mode)
        const reloadBar = this.panelEl.querySelector('.cannon-reload-progress') as HTMLElement;
        if (reloadBar) {
            if (cannon.reloadProgress !== undefined && cannon.reloadTime !== undefined
                && cannon.currentAmmo < cannon.maxAmmo) {
                const progress = (cannon.reloadProgress / cannon.reloadTime) * 100;
                reloadBar.style.width = `${progress}%`;
                reloadBar.style.display = 'block';
            } else {
                reloadBar.style.width = '0%';
                reloadBar.style.display = 'none';
            }
        }

        // Update button states
        const fireBtn = this.panelEl.querySelector('.cannon-fire-btn') as HTMLButtonElement;
        const semiBtn = this.panelEl.querySelector('.cannon-semi-btn') as HTMLButtonElement;
        const clearBtn = this.panelEl.querySelector('.cannon-clear-btn') as HTMLButtonElement;

        if (fireBtn) {
            fireBtn.disabled = cannon.currentAmmo <= 0 || !cannon.inValidTerritory;
            fireBtn.textContent = this.isTargetingMode ? '取消瞄准' : '瞄准射击';
        }

        if (semiBtn) {
            semiBtn.disabled = !cannon.inValidTerritory;
            semiBtn.textContent = cannon.semiAutoMode ? '更改标记' : '标记区域';
        }

        if (clearBtn) {
            clearBtn.style.display = cannon.semiAutoMode ? 'block' : 'none';
        }

        // Update hint
        const hintEl = this.panelEl.querySelector('.cannon-hint');
        if (hintEl) {
            if (!cannon.inValidTerritory) {
                hintEl.textContent = '领地无效，无法使用';
            } else if (this.isTargetingMode) {
                hintEl.textContent = '点击地图选择目标位置';
            } else if (cannon.currentAmmo <= 0 && cannon.reloadTime !== undefined
                       && cannon.reloadProgress !== undefined) {
                const seconds = Math.ceil((cannon.reloadTime - cannon.reloadProgress) / scalePeriod(60));
                hintEl.textContent = `装填中... ${seconds}秒`;
            } else if (cannon.currentAmmo <= 0) {
                hintEl.textContent = '装填中...';
            } else if (cannon.semiAutoMode) {
                hintEl.textContent = '半自动模式：自动攻击标记区域';
            } else {
                hintEl.textContent = '点击"瞄准射击"选择目标';
            }
        }
    }

    /**
     * Enter targeting mode
     */
    private enterTargetingMode(): void {
        if (!this.currentCannon) return;

        if (this.isTargetingMode) {
            // Cancel targeting mode
            this.isTargetingMode = false;
        } else {
            if (this.currentCannon.currentAmmo > 0 && this.currentCannon.inValidTerritory) {
                this.isTargetingMode = true;
            }
        }
        this.updateDisplay();
    }

    /**
     * Enter semi-auto mode (mark target area)
     */
    private enterSemiAutoMode(): void {
        if (!this.currentCannon || !this.currentCannon.inValidTerritory) return;

        // Request semi-auto area selection from game controller
        // This will be handled by the game controller's click handler
        this.isTargetingMode = true;
        const hintEl = this.panelEl?.querySelector('.cannon-hint');
        if (hintEl) {
            hintEl.textContent = '点击地图选择半自动目标区域';
        }

        // Store selection type for handleTargetSelected
        this._semiAutoSelection = true;
    }

    /**
     * Clear semi-auto mode
     */
    private clearSemiAuto(): void {
        if (!this.currentCannon) return;

        if (this.networkClient && this.currentCannon.id) {
            this.networkClient.cannonClearAutoTarget(this.currentCannon.id);
        } else if (this.currentCannon.clearMarkedTarget) {
            this.currentCannon.clearMarkedTarget();
        }
        this.updateDisplay();
    }

    /**
     * Handle target selection from game controller
     */
    handleTargetSelected(worldPos: Vector): boolean {
        if (!this.currentCannon || !this.isTargetingMode) return false;

        const cannon = this.currentCannon;
        const cannonId = cannon.id;

        // Check if this is semi-auto selection
        if (this._semiAutoSelection) {
            const radius = 100;
            if (this.networkClient && cannonId) {
                this.networkClient.cannonSetAutoTarget({
                    towerId: cannonId,
                    targetX: worldPos.x,
                    targetY: worldPos.y,
                    radius,
                });
            } else if (cannon.setMarkedTarget) {
                cannon.setMarkedTarget(worldPos, radius);
            }
            this._semiAutoSelection = false;
            this.isTargetingMode = false;
            this.updateDisplay();
            return true;
        }

        // Regular fire mode
        if (this.networkClient && cannonId) {
            this.networkClient.cannonFire({
                towerId: cannonId,
                targetX: worldPos.x,
                targetY: worldPos.y,
            });
            // In multiplayer, assume server handles ammo
            if (cannon.currentAmmo <= 1) {
                this.isTargetingMode = false;
            }
            this.updateDisplay();
            return true;
        }

        // Single-player: validate and fire locally
        if (cannon.isValidTargetPosition && cannon.fireAt) {
            if (cannon.isValidTargetPosition(worldPos)) {
                const success = cannon.fireAt(worldPos);
                if (success) {
                    // Stay in targeting mode if still have ammo
                    if (cannon.currentAmmo <= 0) {
                        this.isTargetingMode = false;
                    }
                    this.updateDisplay();
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Set callback for target selection
     */
    setOnTargetCallback(callback: (pos: Vector) => void): void {
        this.onTargetCallback = callback;
    }

    /**
     * Set callback for semi-auto area selection
     */
    setOnSemiAutoCallback(callback: (pos: Vector, radius: number) => void): void {
        this.onSemiAutoCallback = callback;
    }

    /**
     * Start refresh interval
     */
    private startRefresh(): void {
        this.stopRefresh();
        this.refreshInterval = setInterval(() => {
            if (this.isVisible() && this.currentCannon) {
                this.updateDisplay();
            }
        }, 100);
    }

    /**
     * Stop refresh interval
     */
    private stopRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stopRefresh();
        if (this.panelEl && this.panelEl.parentNode) {
            this.panelEl.parentNode.removeChild(this.panelEl);
        }
        this.panelEl = null;
    }
}
