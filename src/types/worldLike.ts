/**
 * Unified WorldLike interfaces for decoupling
 *
 * These interfaces are used throughout the codebase to avoid circular dependencies.
 * Each module only needs a subset of WorldLike properties, so we use interface
 * composition to keep dependencies minimal.
 */

import type { Vector } from '@/core/math/vector';
import type { Circle } from '@/core/math/circle';

// ============================================================================
// Basic type interfaces (used as building blocks)
// ============================================================================

/** Minimal vector interface */
export interface VectorLike {
    x: number;
    y: number;
}

/** Minimal circle interface */
export interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

// ============================================================================
// User and Player interfaces
// ============================================================================

/** User state interface */
export interface UserLike {
    money: number;
}

// ============================================================================
// Entity interfaces (minimal versions to avoid circular deps)
// ============================================================================

/** Minimal monster interface for targeting/collision */
export interface MonsterLike {
    pos: VectorLike;
    r?: number;
    getBodyCircle(): CircleLike;
    hpChange(delta: number, attackerId?: string | null): void;
    isDead(): boolean;
    /** Owner player ID for multiplayer (null = neutral) */
    ownerId: string | null;
    /** Target destination for multiplayer mode */
    destination?: VectorLike;
}

/** Minimal bullet interface */
export interface BulletLike {
    pos: VectorLike;
    speed: VectorLike;
    r: number;
    laserDestoryAble?: boolean;
    bodyRadiusChange(dr: number): void;
    acceleration: VectorLike;
    damageChange(delta: number): void;
    remove(): void;
    /** Owner player ID for multiplayer (null = neutral) */
    ownerId?: string | null;
}

/** Minimal building interface for targeting/collision */
export interface BuildingLike {
    pos: VectorLike;
    hp: number;
    maxHp: number;
    r?: number;
    getBodyCircle(): CircleLike;
    hpChange(delta: number, attackerId?: string | null): void;
    isDead(): boolean;
    // Tower-specific (optional, for threat calculation)
    damage?: number;
    clock?: number;
    // Territory related
    gameType?: string;
    otherHpAddAble?: boolean;
    moneyAddedAble?: boolean;
    rangeR?: number;
    inValidTerritory?: boolean;
    _territoryPenaltyApplied?: boolean;
    _originalMaxHp?: number | null;
    _originalRangeR?: number | null;
    /** Owner player ID for multiplayer (null = neutral) */
    ownerId: string | null;
    // UI state
    selected?: boolean;
    // MonsterSpawner specific
    canSpawnMonsters?: boolean;
    // Rendering methods
    renderStatic?(ctx: CanvasRenderingContext2D): void;
    renderDynamic?(ctx: CanvasRenderingContext2D): void;
}

/** Minimal tower interface */
export interface TowerLike {
    pos: VectorLike;
    r?: number;
    rangeR?: number;
    hpChange(delta: number, attackerId?: string | null): void;
    getBodyCircle?(): CircleLike;
    getTowerLevel?(): number;
    inValidTerritory?: boolean;
    /** Owner player ID for multiplayer (null = neutral) */
    ownerId: string | null;
    // Type identification
    gameType?: string;
    // UI state
    selected?: boolean;
    // ManualCannon specific
    canAttackBuildings?: boolean;
    // Rendering methods
    renderBody?(ctx: CanvasRenderingContext2D): void;
    renderBars?(ctx: CanvasRenderingContext2D): void;
}

// ============================================================================
// System interfaces
// ============================================================================

/** Territory system interface */
export interface TerritoryLike {
    markDirty(): void;
    addBuildingIncremental?(building: unknown): void;
    removeBuildingIncremental?(building: unknown): void;
    validBuildings?: Set<unknown>;
    recalculate?(): void;
}

/** Fog of war system interface */
export interface FogOfWarLike {
    enabled: boolean;
    isPositionVisible(x: number, y: number): boolean;
    isCircleVisible(x: number, y: number, radius: number): boolean;
    markDirty(): void;
}

/** Camera interface */
export interface CameraLike {
    x: number;
    y: number;
    zoom: number;
    viewWidth?: number;
    viewHeight?: number;
}

/** Energy system interface */
export interface EnergyLike {
    getSatisfactionRatio(): number;
}

/** Cheat mode interface */
export interface CheatModeLike {
    enabled: boolean;
    priceMultiplier?: number;
    infiniteHp: boolean;
    disableEnergy?: boolean;
}

/** Root building interface */
export interface RootBuildingLike {
    pos: VectorLike;
    hp?: number;
    maxHp?: number;
}

// ============================================================================
// WorldLike interface (unified)
// ============================================================================

/**
 * Unified WorldLike interface
 *
 * This is the complete interface. Individual modules should use more
 * specific sub-interfaces when possible to minimize coupling.
 */
export interface WorldLike {
    // Dimensions
    width: number;
    height: number;
    viewWidth?: number;
    viewHeight?: number;

    // Precomputed world constants (for monster spawning)
    worldCenterX?: number;
    worldCenterY?: number;
    minMonsterRadius?: number;
    monsterRadiusRange?: number;

    // User state
    user: UserLike;

    // Entity collections
    batterys: TowerLike[];
    monsters?: Set<MonsterLike>;
    buildings?: BuildingLike[] | Set<BuildingLike>;
    mines?: Set<unknown>;
    allBullys?: Iterable<BulletLike>;
    othersBullys?: BulletLike[];

    // Core building
    rootBuilding: RootBuildingLike;

    // Systems (all optional for flexibility)
    territory?: TerritoryLike;
    fog?: FogOfWarLike;
    camera?: CameraLike;
    energy?: EnergyLike;
    cheatMode?: CheatModeLike;

    // Game state
    time?: number;
    maxMonsterNum?: number;

    // Query methods
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    getBullysInRange?(x: number, y: number, range: number): BulletLike[];
    getBuildingsInRange?(x: number, y: number, range: number): BuildingLike[];
    getAllBuildingArr?(): BuildingLike[];

    // Entity management methods
    addBully?(bully: unknown): void;
    removeBully?(bully: unknown): void;
    addMonster?(monster: unknown): void;
    removeMonster?(monster: unknown): void;
    addEffect?(effect: unknown): void;

    // Money management (multiplayer compatible)
    addMoneyToOwner?(ownerId: string | null, amount: number): void;
    getMoney?(playerId?: string): number;
    setMoney?(amount: number, playerId?: string): void;
    addMoney?(amount: number, playerId?: string): void;
    spendMoney?(amount: number, force?: boolean): boolean;

    // Base building accessor (multiplayer compatible)
    getBaseBuilding?(playerId?: string): RootBuildingLike;

    // Static layer
    markStaticLayerDirty?(): void;

    // Spatial system methods (for entity movement tracking)
    markBuildingQuadTreeDirty?(): void;
    markSpatialDirty?(entity: unknown): void;

    // Energy system (multiplayer compatible)
    getEnergyForOwner?(ownerId: string | null): EnergyLike;
}

// ============================================================================
// Specialized WorldLike sub-interfaces for specific use cases
// ============================================================================

/** WorldLike for tower base classes */
export interface WorldLikeForTower {
    width: number;
    height: number;
    batterys: TowerLike[];
    territory?: TerritoryLike;
    fog?: FogOfWarLike;
    user: UserLike;
    energy?: EnergyLike;
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully?(bully: unknown): void;
    removeBully?(bully: unknown): void;
    addEffect?(effect: unknown): void;
}

/** WorldLike for monster base classes */
export interface WorldLikeForMonster {
    width: number;
    height: number;
    worldCenterX?: number;
    worldCenterY?: number;
    minMonsterRadius?: number;
    monsterRadiusRange?: number;
    monsters: Set<MonsterLike>;
    allBullys: Iterable<BulletLike>;
    rootBuilding: RootBuildingLike;
    user: UserLike;
    territory?: TerritoryLike;
    fog?: FogOfWarLike;
    cheatMode?: CheatModeLike;
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    getBullysInRange(x: number, y: number, range: number): BulletLike[];
    getBuildingsInRange(x: number, y: number, range: number): BuildingLike[];
    getAllBuildingArr(): BuildingLike[];
    addMonster(monster: unknown): void;
    removeMonster(monster: unknown): void;
    addEffect?(effect: unknown): void;
    addMoneyToOwner?(ownerId: string | null, amount: number): void;
}

/** WorldLike for bullet classes */
export interface WorldLikeForBullet {
    width: number;
    height: number;
    monsters: Iterable<MonsterLike>;
    othersBullys?: BulletLike[];
    fog?: FogOfWarLike;
    removeBully(bully: unknown): void;
    addBully(bully: unknown): void;
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    getBuildingsInRange(x: number, y: number, range: number): BuildingLike[];
    getAllBuildingArr(): BuildingLike[];
    addEffect(effect: unknown): void;
}

/** WorldLike for building classes */
export interface WorldLikeForBuilding {
    width: number;
    height: number;
    user: UserLike;
    territory?: TerritoryLike;
    buildings?: Set<BuildingLike>;
    batterys?: TowerLike[];
    addEffect?(effect: unknown): void;
    addMoneyToOwner?(ownerId: string | null, amount: number): void;
}

/** WorldLike for CircleObject base class */
export interface WorldLikeForCircleObject {
    width: number;
    height: number;
    cheatMode?: CheatModeLike;
}

/** WorldLike for factory functions (minimal) */
export interface WorldLikeForFactory {
    batterys: unknown[];
    cheatMode?: CheatModeLike;
}
