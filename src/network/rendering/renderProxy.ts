/**
 * Render Proxy Entities
 * Lightweight proxy classes that wrap server Schema objects and implement renderer interfaces
 * These proxies allow WorldRenderer to render network-synchronized entities
 */

import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { createStatusBarCache, type StatusBarCache } from '../../entities/statusBar';
import { getInterpolationSystem } from './interpolation';

// ============================================================================
// Server state view interfaces (mirrors Colyseus schema, avoids cross-project import)
// ============================================================================

export interface TowerStateView {
    id: string;
    ownerId: string;
    towerType: string;
    position: { x: number; y: number };
    hp: number;
    maxHp: number;
    level: number;
    radius: number;
    attackRadius: number;
    attackClock: number;
    isManual: boolean;
}

export interface MonsterStateView {
    id: string;
    ownerId: string;
    monsterType: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    hp: number;
    maxHp: number;
    radius: number;
    speed: number;
}

export interface BuildingStateView {
    id: string;
    ownerId: string;
    buildingType: string;
    position: { x: number; y: number };
    hp: number;
    maxHp: number;
    radius: number;
    isBase: boolean;
    isSpawner: boolean;
}

// ============================================================================
// Shared render resources (reused across proxies to reduce GC)
// ============================================================================

// Cached circle for body rendering
const _bodyCirclePool: Circle[] = [];
let _poolIndex = 0;

function getPooledCircle(x: number, y: number, r: number): Circle {
    if (_poolIndex >= _bodyCirclePool.length) {
        _bodyCirclePool.push(new Circle(x, y, r));
    }
    const circle = _bodyCirclePool[_poolIndex++];
    circle.x = x;
    circle.y = y;
    circle.r = r;
    circle.pos.x = x;
    circle.pos.y = y;
    return circle;
}

function resetCirclePool(): void {
    _poolIndex = 0;
}

// Default colors
const DEFAULT_HP_COLOR = { r: 0, g: 255, b: 0, a: 0.8 };
const TOWER_FILL_COLOR = new MyColor(100, 150, 200, 1);
const MONSTER_FILL_COLOR = new MyColor(200, 50, 50, 1);
const BUILDING_FILL_COLOR = new MyColor(100, 100, 100, 1);

// ============================================================================
// TowerRenderProxy - Implements renderer interface for towers
// ============================================================================

/**
 * Tower render proxy - wraps TowerState and provides rendering interface
 */
export class TowerRenderProxy {
    // Reference to server state
    private _state: TowerStateView;

    // Cached position (updated from interpolation)
    private _interpolatedPos: Vector;

    // Cached rendering objects
    private _bodyCircle: Circle;
    private _viewCircle: Circle;
    readonly _hpBarCache: StatusBarCache;
    readonly _cooldownBarCache: StatusBarCache;
    readonly _chargeBarCache: StatusBarCache;

    // Renderer interface properties
    readonly hpBarHeight: number = 6;
    readonly hpColor = DEFAULT_HP_COLOR;
    readonly imgIndex: number = 0;
    readonly selected: boolean = false;
    readonly bullys: Set<unknown> = new Set(); // Empty for network mode (bullets not synced)
    _upIconOffset: Vector | null = null;
    readonly liveTime: number = 0;

    constructor(state: TowerStateView) {
        this._state = state;
        this._interpolatedPos = new Vector(state.position.x, state.position.y);
        this._bodyCircle = new Circle(state.position.x, state.position.y, state.radius);
        this._bodyCircle.fillColor = TOWER_FILL_COLOR;
        this._viewCircle = new Circle(state.position.x, state.position.y, state.attackRadius);
        this._viewCircle.fillColor.setRGBA(0, 0, 0, 0);
        this._viewCircle.strokeColor.setRGBA(255, 255, 255, 0.3);
        this._hpBarCache = createStatusBarCache();
        this._cooldownBarCache = createStatusBarCache();
        this._chargeBarCache = createStatusBarCache();
    }

    // Entity ID
    get id(): string {
        return this._state.id;
    }

    // Owner ID
    get ownerId(): string {
        return this._state.ownerId;
    }

    // Position (interpolated)
    get pos(): Vector {
        const interp = getInterpolationSystem();
        const interpPos = interp.getPositionOrDefault(
            this._state.id,
            this._state.position.x,
            this._state.position.y
        );
        this._interpolatedPos.x = interpPos.x;
        this._interpolatedPos.y = interpPos.y;
        return this._interpolatedPos;
    }

    // Radius
    get r(): number {
        return this._state.radius;
    }

    // Range radius
    get rangeR(): number {
        return this._state.attackRadius;
    }

    // HP
    get hp(): number {
        return this._state.hp;
    }

    // Max HP
    get maxHp(): number {
        return this._state.maxHp;
    }

    // Level
    get level(): number {
        return this._state.level;
    }

    // Tower type
    get towerType(): string {
        return this._state.towerType;
    }

    // Territory flag (network mode always valid)
    get inValidTerritory(): boolean {
        return true;
    }

    // Dead check
    isDead(): boolean {
        return this._state.hp <= 0;
    }

    // Screen visibility (simplified for network mode)
    isInScreen(): boolean {
        return true; // Let WorldRenderer handle culling
    }

    // Get body circle
    getBodyCircle(): Circle {
        const pos = this.pos;
        this._bodyCircle.x = pos.x;
        this._bodyCircle.y = pos.y;
        this._bodyCircle.pos.x = pos.x;
        this._bodyCircle.pos.y = pos.y;
        this._bodyCircle.r = this._state.radius;
        return this._bodyCircle;
    }

    // Get view (range) circle
    getViewCircle(): Circle {
        const pos = this.pos;
        this._viewCircle.x = pos.x;
        this._viewCircle.y = pos.y;
        this._viewCircle.r = this._state.attackRadius;
        return this._viewCircle;
    }

    // Image sprite position (stub - network mode may not use sprites)
    getImgStartPosByIndex(_n: number): Vector {
        return new Vector(0, 0);
    }

    // Upgrade check (network mode - based on level)
    isUpLevelAble(): boolean {
        return false; // Server controls upgrades
    }

    // Tower level getter
    getTowerLevel(): number {
        return this._state.level;
    }

    // HP change (no-op in network mode - server controls HP)
    hpChange(_delta: number): void {
        // Server authoritative
    }

    // Update proxy from new state snapshot
    updateFromState(state: TowerStateView): void {
        this._state = state;
        // Push position to interpolation system
        const interp = getInterpolationSystem();
        interp.pushSnapshot(state.id, state.position.x, state.position.y, 0);
    }
}

// ============================================================================
// MonsterRenderProxy - Implements renderer interface for monsters
// ============================================================================

/**
 * Monster render proxy - wraps MonsterStateView and provides rendering interface
 */
export class MonsterRenderProxy {
    private _state: MonsterStateView;
    private _interpolatedPos: Vector;
    private _bodyCircle: Circle;

    // Renderer interface properties
    readonly _hpBarCache: StatusBarCache;
    readonly _laserBarCache: StatusBarCache;
    readonly hpBarHeight: number = 5;
    readonly hpColor = DEFAULT_HP_COLOR;
    readonly imgIndex: number = 0;
    readonly name: string = '';

    // Ability flags (default off for network proxies)
    readonly bombSelfAble: boolean = false;
    readonly bombSelfRange: number = 0;
    readonly haveGArea: boolean = false;
    readonly gAreaR: number = 0;
    readonly haveBullyChangeArea: boolean = false;
    readonly bullyChangeDetails = { r: 0 };
    readonly haveGain: boolean = false;
    readonly gainDetails = { gainRadius: 0 };
    readonly haveLaserDefence: boolean = false;
    readonly laserRadius: number = 0;
    readonly laserDefendNum: number = 0;
    readonly maxLaserNum: number = 0;

    // For sweep collision (stored locally)
    prevX: number = 0;
    prevY: number = 0;

    constructor(state: MonsterStateView) {
        this._state = state;
        this._interpolatedPos = new Vector(state.position.x, state.position.y);
        this._bodyCircle = new Circle(state.position.x, state.position.y, state.radius);
        this._bodyCircle.fillColor = MONSTER_FILL_COLOR;
        this._hpBarCache = createStatusBarCache();
        this._laserBarCache = createStatusBarCache();
        this.prevX = state.position.x;
        this.prevY = state.position.y;
    }

    get id(): string {
        return this._state.id;
    }

    get ownerId(): string {
        return this._state.ownerId;
    }

    get pos(): Vector {
        const interp = getInterpolationSystem();
        const interpPos = interp.getPositionOrDefault(
            this._state.id,
            this._state.position.x,
            this._state.position.y
        );
        // Update prevX/prevY for sweep collision
        this.prevX = this._interpolatedPos.x;
        this.prevY = this._interpolatedPos.y;
        this._interpolatedPos.x = interpPos.x;
        this._interpolatedPos.y = interpPos.y;
        return this._interpolatedPos;
    }

    get r(): number {
        return this._state.radius;
    }

    get hp(): number {
        return this._state.hp;
    }

    get maxHp(): number {
        return this._state.maxHp;
    }

    get monsterType(): string {
        return this._state.monsterType;
    }

    isDead(): boolean {
        return this._state.hp <= 0;
    }

    isInScreen(): boolean {
        return true;
    }

    isOutScreen(): boolean {
        return false;
    }

    getBodyCircle(): Circle {
        const pos = this.pos;
        this._bodyCircle.x = pos.x;
        this._bodyCircle.y = pos.y;
        this._bodyCircle.pos.x = pos.x;
        this._bodyCircle.pos.y = pos.y;
        this._bodyCircle.r = this._state.radius;
        return this._bodyCircle;
    }

    getImgStartPosByIndex(_n: number): Vector {
        return new Vector(0, 0);
    }

    hpChange(_delta: number): void {
        // Server authoritative
    }

    updateFromState(state: MonsterStateView): void {
        this._state = state;
        const interp = getInterpolationSystem();
        interp.pushSnapshot(state.id, state.position.x, state.position.y, 0);
    }
}

// ============================================================================
// BuildingRenderProxy - Implements renderer interface for buildings
// ============================================================================

/**
 * Building render proxy - wraps BuildingStateView and provides rendering interface
 */
export class BuildingRenderProxy {
    private _state: BuildingStateView;
    private _pos: Vector;
    private _bodyCircle: Circle;

    readonly _hpBarCache: StatusBarCache;
    readonly hpBarHeight: number = 6;
    readonly hpColor = DEFAULT_HP_COLOR;
    readonly otherHpAddAble: boolean = false;
    readonly otherHpAddRadius: number = 0;
    readonly gameType: string = '';

    constructor(state: BuildingStateView) {
        this._state = state;
        this._pos = new Vector(state.position.x, state.position.y);
        this._bodyCircle = new Circle(state.position.x, state.position.y, state.radius);
        this._bodyCircle.fillColor = BUILDING_FILL_COLOR;
        this._hpBarCache = createStatusBarCache();
    }

    get id(): string {
        return this._state.id;
    }

    get ownerId(): string {
        return this._state.ownerId;
    }

    get pos(): Vector {
        this._pos.x = this._state.position.x;
        this._pos.y = this._state.position.y;
        return this._pos;
    }

    get r(): number {
        return this._state.radius;
    }

    get hp(): number {
        return this._state.hp;
    }

    get maxHp(): number {
        return this._state.maxHp;
    }

    get isBase(): boolean {
        return this._state.isBase;
    }

    get buildingType(): string {
        return this._state.buildingType;
    }

    isDead(): boolean {
        return this._state.hp <= 0;
    }

    isInScreen(): boolean {
        return true;
    }

    getBodyCircle(): Circle {
        const pos = this.pos;
        this._bodyCircle.x = pos.x;
        this._bodyCircle.y = pos.y;
        this._bodyCircle.pos.x = pos.x;
        this._bodyCircle.pos.y = pos.y;
        this._bodyCircle.r = this._state.radius;
        return this._bodyCircle;
    }

    hpChange(_delta: number): void {
        // Server authoritative
    }

    goStep(): void {
        // No-op in network mode
    }

    render(_ctx: CanvasRenderingContext2D): void {
        // Rendering handled by WorldRenderer
    }

    updateFromState(state: BuildingStateView): void {
        this._state = state;
    }
}

// ============================================================================
// BulletRenderProxy - Local effect bullet for visualization
// ============================================================================

/**
 * Local bullet for visual effects (not synchronized)
 * Used for showing attack animations between TOWER_ATTACK and hit events
 */
export class BulletRenderProxy {
    private _pos: Vector;
    private _targetPos: Vector;
    private _bodyCircle: Circle;
    private _speed: number;
    private _isExpired: boolean = false;

    readonly r: number;
    prevX: number;
    prevY: number;

    constructor(
        startX: number,
        startY: number,
        targetX: number,
        targetY: number,
        radius: number = 5,
        speed: number = 15
    ) {
        this._pos = new Vector(startX, startY);
        this._targetPos = new Vector(targetX, targetY);
        this._bodyCircle = new Circle(startX, startY, radius);
        this._bodyCircle.fillColor.setRGBA(255, 200, 0, 1);
        this.r = radius;
        this._speed = speed;
        this.prevX = startX;
        this.prevY = startY;
    }

    get pos(): Vector {
        return this._pos;
    }

    get isExpired(): boolean {
        return this._isExpired;
    }

    isOutScreen(): boolean {
        return this._isExpired;
    }

    getBodyCircle(): Circle {
        this._bodyCircle.x = this._pos.x;
        this._bodyCircle.y = this._pos.y;
        this._bodyCircle.pos.x = this._pos.x;
        this._bodyCircle.pos.y = this._pos.y;
        return this._bodyCircle;
    }

    // Move bullet toward target
    move(): void {
        this.prevX = this._pos.x;
        this.prevY = this._pos.y;

        const dx = this._targetPos.x - this._pos.x;
        const dy = this._targetPos.y - this._pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this._speed) {
            // Arrived at target
            this._pos.x = this._targetPos.x;
            this._pos.y = this._targetPos.y;
            this._isExpired = true;
        } else {
            // Move toward target
            this._pos.x += (dx / dist) * this._speed;
            this._pos.y += (dy / dist) * this._speed;
        }
    }

    // Collision check (no-op for local effects)
    collide(_world: unknown): void {
        // Local effect - no actual collision
    }

    goStep(): void {
        this.move();
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this._isExpired) return;
        this.getBodyCircle().render(ctx);
    }
}

// ============================================================================
// Exports
// ============================================================================

export { resetCirclePool };
