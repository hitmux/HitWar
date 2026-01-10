/**
 * Battle mode type definitions
 */

import { Vector } from '../../../core/math/vector';
import { VisionType } from '../../../systems/fog/visionConfig';
import { InputHandler } from '../../../core/input/inputHandler';

/**
 * Game entity interface for towers/buildings
 */
export interface GameEntity {
    pos: Vector;
    name: string;
    price: number;
    gameType: string;
    r?: number;
    rangeR?: number;
    selected?: boolean;
    levelUpArr: unknown[];
    levelDownGetter: unknown;
    towerLevel: number;
    imgIndex: number;
    inValidTerritory: boolean;
    comment?: string;
    getBodyCircle: () => { pointIn: (x: number, y: number) => boolean; impact: (other: unknown) => boolean };
    getImgStartPosByIndex: (index: number) => { x: number; y: number };
    remove: () => void;
    // Vision system methods
    getSellRefund?: () => number;
    visionType?: VisionType;
    visionLevel?: number;
    radarAngle?: number;
    canUpgradeVision?: (type: VisionType) => boolean;
    upgradeVision?: (type: VisionType) => boolean;
    getVisionUpgradePrice?: (type: VisionType) => number;
}

/**
 * Canvas element with InputHandler attached
 */
export interface CanvasWithInputHandler extends HTMLCanvasElement {
    _inputHandler?: InputHandler;
    _eventAbortController?: AbortController;
}

/**
 * Battle mode configuration
 */
export interface BattleModeConfig {
    /** Game difficulty mode: "easy", "normal", "hard" */
    mode: string;
    /** Whether to have monster waves (false for infinite time mode) */
    haveGroup: boolean;
    /** Pre-loaded save data (from file import) */
    loadedSaveData?: unknown;
}

/**
 * Game state shared between controllers
 */
export interface GameState {
    /** Whether the game has ended */
    gameEnd: boolean;
    /** Whether the game is paused */
    isGamePause: boolean;
    /** Currently selected entity for placement */
    addedThingFunc: ((world: unknown) => GameEntity) | null;
    /** Currently selected thing (for info panel) */
    selectedThing: GameEntity | null;
}

/**
 * Performance degradation guard state
 */
export interface LoopGuardState {
    consecutiveOverload: number;
    overloadThreshold: number;
    recoveryThreshold: number;
    consecutiveNormal: number;
    degradationLevel: number;
    maxDegradation: number;
    lastWarningTime: number;
    warningCooldown: number;
}

/**
 * Degradation parameters: [maxStepsMultiplier, stepMultiplier]
 */
export type DegradationParams = [number, number][];
