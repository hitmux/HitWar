/**
 * Client Prediction System
 * Provides immediate visual feedback for player actions before server confirmation
 *
 * Currently supports:
 * - Build tower prediction (ghost tower display)
 * - Sell tower prediction (fade-out effect)
 */

import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { createStatusBarCache, type StatusBarCache } from '../../entities/statusBar';

/**
 * Prediction state for a pending action
 */
export type PredictionState = 'pending' | 'confirmed' | 'rejected';

/**
 * Predicted tower (ghost tower before server confirmation)
 */
export interface PredictedTower {
    // Unique prediction ID (for matching server response)
    predictionId: string;

    // Tower properties
    towerType: string;
    x: number;
    y: number;
    radius: number;
    rangeR: number;

    // State
    state: PredictionState;
    createdAt: number;

    // Render properties
    alpha: number;
}

/**
 * Predicted sell action
 */
export interface PredictedSell {
    predictionId: string;
    towerId: string;
    state: PredictionState;
    createdAt: number;
}

/**
 * Ghost tower render proxy for prediction visualization
 */
export class GhostTowerProxy {
    private _prediction: PredictedTower;
    private _pos: Vector;
    private _bodyCircle: Circle;
    private _rangeCircle: Circle;

    readonly _hpBarCache: StatusBarCache;
    readonly hpBarHeight: number = 6;
    readonly hpColor = { r: 0, g: 255, b: 0, a: 0.8 };
    readonly imgIndex: number = 0;
    readonly selected: boolean = false;
    readonly bullys: Set<unknown> = new Set();
    _upIconOffset: Vector | null = null;
    readonly liveTime: number = 0;

    constructor(prediction: PredictedTower) {
        this._prediction = prediction;
        this._pos = new Vector(prediction.x, prediction.y);

        this._bodyCircle = new Circle(prediction.x, prediction.y, prediction.radius);
        this._bodyCircle.fillColor = new MyColor(100, 200, 255, 0.4);
        this._bodyCircle.strokeColor = new MyColor(50, 150, 255, 0.8);
        this._bodyCircle.strokeWidth = 2;

        this._rangeCircle = new Circle(prediction.x, prediction.y, prediction.rangeR);
        this._rangeCircle.fillColor.setRGBA(0, 0, 0, 0);
        this._rangeCircle.strokeColor.setRGBA(100, 200, 255, 0.3);
        this._rangeCircle.strokeWidth = 1;

        this._hpBarCache = createStatusBarCache();
    }

    get predictionId(): string {
        return this._prediction.predictionId;
    }

    get state(): PredictionState {
        return this._prediction.state;
    }

    get pos(): Vector {
        return this._pos;
    }

    get r(): number {
        return this._prediction.radius;
    }

    get rangeR(): number {
        return this._prediction.rangeR;
    }

    // Ghost towers show as full HP
    get hp(): number {
        return 1000;
    }

    get maxHp(): number {
        return 1000;
    }

    get ownerId(): string | null {
        return null; // Local prediction
    }

    get inValidTerritory(): boolean {
        return true;
    }

    isDead(): boolean {
        return this._prediction.state === 'rejected';
    }

    isInScreen(): boolean {
        return true;
    }

    getBodyCircle(): Circle {
        // Update alpha based on state
        const alpha = this._prediction.state === 'rejected' ? 0.1 : 0.4;
        this._bodyCircle.fillColor.changeAlpha(alpha);
        return this._bodyCircle;
    }

    getViewCircle(): Circle {
        return this._rangeCircle;
    }

    getImgStartPosByIndex(_n: number): Vector {
        return new Vector(0, 0);
    }

    isUpLevelAble(): boolean {
        return false;
    }

    getTowerLevel(): number {
        return 1;
    }

    hpChange(_delta: number): void {
        // Ghost tower - no HP changes
    }

    updateState(state: PredictionState): void {
        this._prediction.state = state;
    }
}

/**
 * Client Prediction Manager
 * Manages predicted actions and their visual representation
 */
export class ClientPrediction {
    // Predicted towers (pending build actions)
    private _predictedTowers: Map<string, PredictedTower> = new Map();
    private _ghostProxies: Map<string, GhostTowerProxy> = new Map();

    // Predicted sells (pending sell actions)
    private _predictedSells: Map<string, PredictedSell> = new Map();

    // Counter for generating prediction IDs
    private _predictionCounter: number = 0;

    // Timeout for pending predictions (ms)
    private readonly PREDICTION_TIMEOUT = 5000;

    /**
     * Generate unique prediction ID
     */
    private generatePredictionId(): string {
        return `pred_${Date.now()}_${this._predictionCounter++}`;
    }

    /**
     * Predict tower build
     * Returns prediction ID to match with server response
     */
    predictBuild(
        towerType: string,
        x: number,
        y: number,
        radius: number = 15,
        rangeR: number = 200
    ): string {
        const predictionId = this.generatePredictionId();

        const prediction: PredictedTower = {
            predictionId,
            towerType,
            x,
            y,
            radius,
            rangeR,
            state: 'pending',
            createdAt: Date.now(),
            alpha: 0.5,
        };

        this._predictedTowers.set(predictionId, prediction);
        this._ghostProxies.set(predictionId, new GhostTowerProxy(prediction));

        return predictionId;
    }

    /**
     * Confirm a predicted build (server accepted)
     * The ghost tower will be replaced by real tower from server state
     */
    confirmBuild(predictionId: string): void {
        const prediction = this._predictedTowers.get(predictionId);
        if (prediction) {
            prediction.state = 'confirmed';
            // Remove immediately - real tower will appear from server state
            this._predictedTowers.delete(predictionId);
            this._ghostProxies.delete(predictionId);
        }
    }

    /**
     * Reject a predicted build (server rejected)
     * Ghost tower will fade out
     */
    rejectBuild(predictionId: string): void {
        const prediction = this._predictedTowers.get(predictionId);
        if (prediction) {
            prediction.state = 'rejected';
            const ghost = this._ghostProxies.get(predictionId);
            if (ghost) {
                ghost.updateState('rejected');
            }
            // Schedule removal after brief display
            setTimeout(() => {
                this._predictedTowers.delete(predictionId);
                this._ghostProxies.delete(predictionId);
            }, 500);
        }
    }

    /**
     * Predict tower sell
     * Returns prediction ID
     */
    predictSell(towerId: string): string {
        const predictionId = this.generatePredictionId();

        this._predictedSells.set(predictionId, {
            predictionId,
            towerId,
            state: 'pending',
            createdAt: Date.now(),
        });

        return predictionId;
    }

    /**
     * Confirm a predicted sell
     */
    confirmSell(predictionId: string): void {
        this._predictedSells.delete(predictionId);
    }

    /**
     * Reject a predicted sell
     */
    rejectSell(predictionId: string): void {
        const sell = this._predictedSells.get(predictionId);
        if (sell) {
            sell.state = 'rejected';
            // Remove after brief delay
            setTimeout(() => {
                this._predictedSells.delete(predictionId);
            }, 500);
        }
    }

    /**
     * Check if a tower is pending sell
     */
    isTowerPendingSell(towerId: string): boolean {
        for (const sell of this._predictedSells.values()) {
            if (sell.towerId === towerId && sell.state === 'pending') {
                return true;
            }
        }
        return false;
    }

    /**
     * Get ghost tower proxies for rendering
     */
    getGhostTowers(): GhostTowerProxy[] {
        return Array.from(this._ghostProxies.values());
    }

    /**
     * Update predictions (cleanup timeouts)
     */
    update(): void {
        const now = Date.now();

        // Cleanup timed out predictions
        for (const [id, prediction] of this._predictedTowers) {
            if (now - prediction.createdAt > this.PREDICTION_TIMEOUT) {
                this._predictedTowers.delete(id);
                this._ghostProxies.delete(id);
            }
        }

        for (const [id, sell] of this._predictedSells) {
            if (now - sell.createdAt > this.PREDICTION_TIMEOUT) {
                this._predictedSells.delete(id);
            }
        }
    }

    /**
     * Clear all predictions
     */
    clear(): void {
        this._predictedTowers.clear();
        this._ghostProxies.clear();
        this._predictedSells.clear();
    }

    /**
     * Get prediction count (for debugging)
     */

    // ==================== Matching Methods ====================
    // Used by NetworkWorldAdapter to match server state changes to predictions

    /**
     * Find and confirm a build prediction by (towerType, x, y).
     * Position-based matching ensures correct pairing even with concurrent builds.
     */
    findAndConfirmBuild(towerType: string, x: number, y: number, tolerance = 1): boolean {
        for (const [id, prediction] of this._predictedTowers) {
            if (
                prediction.state === 'pending' &&
                prediction.towerType === towerType &&
                Math.abs(prediction.x - x) <= tolerance &&
                Math.abs(prediction.y - y) <= tolerance
            ) {
                this.confirmBuild(id);
                return true;
            }
        }
        return false;
    }

    /**
     * Reject the oldest pending build prediction (FIFO).
     * Used when ACTION_REJECTED arrives without coordinates.
     */
    rejectOldestPendingBuild(): boolean {
        for (const [id, prediction] of this._predictedTowers) {
            if (prediction.state === 'pending') {
                this.rejectBuild(id);
                return true;
            }
        }
        return false;
    }

    /**
     * Find and confirm a sell prediction by towerId.
     * Called when a tower disappears from server state.
     */
    findAndConfirmSellByTowerId(towerId: string): boolean {
        for (const [id, sell] of this._predictedSells) {
            if (sell.state === 'pending' && sell.towerId === towerId) {
                this.confirmSell(id);
                return true;
            }
        }
        return false;
    }

    /**
     * Reject the oldest pending sell prediction (FIFO).
     * Used when sell ACTION_REJECTED arrives.
     */
    rejectOldestPendingSell(): boolean {
        for (const [id, sell] of this._predictedSells) {
            if (sell.state === 'pending') {
                this.rejectSell(id);
                return true;
            }
        }
        return false;
    }

    getPredictionCount(): number {
        return this._predictedTowers.size + this._predictedSells.size;
    }
}

// Singleton instance
let _clientPrediction: ClientPrediction | null = null;

/**
 * Get the singleton client prediction manager
 */
export function getClientPrediction(): ClientPrediction {
    if (!_clientPrediction) {
        _clientPrediction = new ClientPrediction();
    }
    return _clientPrediction;
}

/**
 * Reset the client prediction manager
 */
export function resetClientPrediction(): void {
    if (_clientPrediction) {
        _clientPrediction.clear();
    }
    _clientPrediction = null;
}
