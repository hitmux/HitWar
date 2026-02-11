/**
 * Battle mode type definitions
 */

import { Vector } from '../../../core/math/vector';
import { VisionType } from '../../../systems/fog/visionConfig';
import { InputHandler } from '../../../core/input/inputHandler';
import type { IEffect } from '../../../types/game';

/**
 * Circle interface for collision detection in PanelManager
 */
export interface PanelCircleLike {
    x: number;
    y: number;
    r: number;
    pointIn(x: number, y: number): boolean;
    impact(other: PanelCircleLike): boolean;
}

/**
 * Minimal entity interface for PanelManager iteration
 * Used by mines, monsters, towers, and buildings
 */
export interface PanelEntityLike {
    x?: number;
    y?: number;
    r?: number;
    pos?: Vector;
    id?: string | null;
    gameType?: string;
    selected?: boolean;
    inValidTerritory?: boolean;
    canSpawnMonsters?: boolean;
    canAttackBuildings?: boolean;
    getBodyCircle(): PanelCircleLike;
}

/**
 * Game entity interface for towers/buildings
 */
export interface GameEntity {
    id?: string | null;
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
    getBodyCircle: () => PanelCircleLike;
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

/**
 * Camera interface for PanelManager
 */
export interface PanelManagerCamera {
    screenToWorld(screenPos: Vector): Vector;
    centerOn?(pos: Vector): void;
    zoom?: number;
}

/**
 * Territory system interface for PanelManager
 */
export interface PanelManagerTerritory {
    isPositionInValidTerritory?(pos: Vector): boolean;
    markDirty?(): void;
    removeBuildingIncremental?(building: unknown): void;
    addBuildingIncremental?(building: unknown): void;
}

/**
 * Fog system interface for PanelManager
 */
export interface PanelManagerFog {
    markDirty?(): void;
}

/**
 * Minimal building shape for placement preview
 */
export interface PanelBuildingPreview {
    r?: number;
    rangeR?: number;
}

/**
 * User state interface for PanelManager
 */
export interface PanelManagerUser {
    putLoc: {
        x: number;
        y: number;
        building: PanelBuildingPreview | PanelEntityLike | null;
    };
    moveTarget: { x: number; y: number; r: number } | null;
}

/**
 * World-like interface for PanelManager
 * Allows both World and MultiplayerWorldFacade to be used
 */
export interface PanelManagerWorldLike {
    // Dimensions
    width: number;
    height: number;

    // Camera
    camera: PanelManagerCamera;

    // User state
    user: PanelManagerUser;

    // Entity collections - use Iterable<unknown> for maximum compatibility
    mines: Iterable<unknown>;
    monsters: Iterable<unknown>;
    obstacles: Array<{ intersectsCircle(circle: PanelCircleLike): boolean }>;

    // Systems (optional for multiplayer)
    territory?: PanelManagerTerritory | null;
    fog?: PanelManagerFog | null;

    // Query methods
    getAllBuildingArr(): PanelEntityLike[];

    // Money operations
    getMoney(): number;
    spendMoney(amount: number): boolean;
    addMoney(amount: number): void;

    // Entity management - accept unknown to support different implementations
    addEffect(effect: IEffect): void;
    addTower(tower: unknown): void;
    addBuilding(building: unknown): void;

    // Tower sell (optional, used by multiplayer facade for client prediction)
    sellTower?(towerId: string): void;

    // Static layer
    markStaticLayerDirty(): void;
}

