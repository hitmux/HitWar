/**
 * MonsterRenderer - Rendering functions for Monster and its subclasses
 * Extracted from Monster, MonsterMortis, MonsterShooter, MonsterTerminator
 */
import { Circle } from '../../core/math/circle';
import { Vector } from '../../core/math/vector';
import {
    renderStatusBar,
    BAR_OFFSET,
    BAR_COLORS,
    type StatusBarCache
} from '../../entities/statusBar';
import { getMonstersImg, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../monsterConstants';

// ============================================================================
// Type interfaces for loose coupling (avoid circular dependencies)
// ============================================================================

export interface MonsterLike {
    pos: Vector;
    r: number;
    hp: number;
    maxHp: number;
    name: string;
    imgIndex: number;
    hpBarHeight: number;
    hpColor: { r: number; g: number; b: number; a: number };
    _hpBarCache: StatusBarCache;

    // Ability flags and properties
    bombSelfAble: boolean;
    bombSelfRange: number;
    haveGArea: boolean;
    gAreaR: number;
    haveBullyChangeArea: boolean;
    bullyChangeDetails: { r: number };
    haveGain: boolean;
    gainDetails: { gainRadius: number };
    haveLaserDefence: boolean;
    laserRadius: number;
    laserDefendNum: number;
    maxLaserNum: number;
    _laserBarCache: StatusBarCache;

    // Methods
    isInScreen(): boolean;
    isDead(): boolean;
    getBodyCircle(): Circle;
    getImgStartPosByIndex(n: number): Vector;
}

export interface MonsterMortisLike extends MonsterLike {
    viewRadius: number;
}

export interface MonsterShooterLike extends MonsterLike {
    rangeR: number;
    bullys: Set<{ render(ctx: CanvasRenderingContext2D): void }>;
}

export interface MonsterTerminatorLike extends MonsterLike {
    scar: Set<{ render(ctx: CanvasRenderingContext2D): void }>;
}

// ============================================================================
// Shared rendering resources
// ============================================================================

// Reusable Circle for range rendering (avoid GC pressure)
let _renderCircle: Circle | null = null;

function getRenderCircle(x: number, y: number, r: number): Circle {
    if (!_renderCircle) {
        _renderCircle = new Circle(x, y, r);
    } else {
        _renderCircle.x = x;
        _renderCircle.y = y;
        _renderCircle.r = r;
    }
    return _renderCircle;
}

// Static grid dimensions (cached after first calculation)
let _gridWidth = 0;
let _gridHeight = 0;

function ensureGridDimensions(): void {
    if (_gridWidth === 0 || _gridHeight === 0) {
        const img = getMonstersImg();
        if (img && img.complete && img.naturalWidth > 0) {
            _gridWidth = Math.floor(img.naturalWidth / MONSTER_IMG_PRE_WIDTH);
            _gridHeight = Math.floor(img.naturalHeight / MONSTER_IMG_PRE_HEIGHT);
        }
    }
}

// Cached font string
const FONT_12 = "12px Microsoft YaHei";

// ============================================================================
// Core rendering functions
// ============================================================================

/**
 * Render base monster body (circle)
 */
export function renderMonsterBody(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    if (!monster.isInScreen()) return;
    const c = monster.getBodyCircle();
    c.render(ctx);
}

/**
 * Render monster HP bar
 */
export function renderMonsterHpBar(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    if (!monster.isInScreen()) return;
    if (monster.maxHp > 0 && !monster.isDead()) {
        const barH = monster.hpBarHeight;
        const barX = monster.pos.x - monster.r;
        const barY = monster.pos.y - monster.r + BAR_OFFSET.HP_TOP * barH;
        const barW = monster.r * 2;
        const hpRate = monster.hp / monster.maxHp;

        renderStatusBar(ctx, {
            x: barX,
            y: barY,
            width: barW,
            height: barH,
            fillRate: hpRate,
            fillColor: monster.hpColor,
            showText: true,
            textValue: monster.hp,
            cache: monster._hpBarCache
        });
    }
}

/**
 * Render monster sprite image
 */
export function renderMonsterSprite(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    const MONSTERS_IMG = getMonstersImg();
    if (MONSTERS_IMG && MONSTERS_IMG.complete && MONSTERS_IMG.naturalWidth > 0) {
        const imgStartPos = monster.getImgStartPosByIndex(monster.imgIndex);
        ctx.drawImage(
            MONSTERS_IMG,
            imgStartPos.x,
            imgStartPos.y,
            MONSTER_IMG_PRE_WIDTH,
            MONSTER_IMG_PRE_HEIGHT,
            monster.pos.x - monster.r,
            monster.pos.y - monster.r,
            monster.r * 2,
            monster.r * 2
        );
    }
}

/**
 * Render monster name text
 */
export function renderMonsterName(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "black";
    ctx.font = FONT_12;
    ctx.textAlign = "center";
    ctx.fillText(monster.name, monster.pos.x, monster.pos.y + monster.r * 1.5);
}

/**
 * Render monster ability range circles
 */
export function renderMonsterAbilities(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    // Bomb self range
    if (monster.bombSelfAble) {
        getRenderCircle(monster.pos.x, monster.pos.y, monster.bombSelfRange).renderView(ctx);
    }
    // Gravity area
    if (monster.haveGArea) {
        getRenderCircle(monster.pos.x, monster.pos.y, monster.gAreaR).renderView(ctx);
    }
    // Bullet manipulation area
    if (monster.haveBullyChangeArea) {
        getRenderCircle(monster.pos.x, monster.pos.y, monster.bullyChangeDetails.r).renderView(ctx);
    }
    // Ally buff area
    if (monster.haveGain) {
        getRenderCircle(monster.pos.x, monster.pos.y, monster.gainDetails.gainRadius).renderView(ctx);
    }
}

/**
 * Render monster laser defense bar and range
 */
export function renderMonsterLaserDefense(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    if (!monster.haveLaserDefence) return;

    // Laser defense range
    getRenderCircle(monster.pos.x, monster.pos.y, monster.laserRadius).renderView(ctx);

    // Laser defense bar
    const barH = monster.hpBarHeight;
    const barX = monster.pos.x - monster.r;
    const barY = monster.pos.y - monster.r + BAR_OFFSET.LASER_DEFENSE * barH;
    const barW = monster.r * 2;
    const laserRate = monster.laserDefendNum / monster.maxLaserNum;

    renderStatusBar(ctx, {
        x: barX,
        y: barY,
        width: barW,
        height: barH,
        fillRate: laserRate,
        fillColor: BAR_COLORS.LASER_DEFENSE,
        showText: true,
        textValue: monster.laserDefendNum,
        cache: monster._laserBarCache
    });
}

// ============================================================================
// Composite rendering functions
// ============================================================================

/**
 * Render complete Monster (base class)
 * Equivalent to Monster.render()
 */
export function renderMonster(monster: MonsterLike, ctx: CanvasRenderingContext2D): void {
    // CircleObject base rendering (body + HP bar)
    renderMonsterBody(monster, ctx);
    renderMonsterHpBar(monster, ctx);

    // Monster-specific rendering
    renderMonsterSprite(monster, ctx);
    renderMonsterName(monster, ctx);
    renderMonsterAbilities(monster, ctx);
    renderMonsterLaserDefense(monster, ctx);
}

/**
 * Render MonsterMortis (adds viewRadius circle)
 */
export function renderMonsterMortis(monster: MonsterMortisLike, ctx: CanvasRenderingContext2D): void {
    renderMonster(monster, ctx);
    // MonsterMortis-specific: view radius circle
    new Circle(monster.pos.x, monster.pos.y, monster.viewRadius).renderView(ctx);
}

/**
 * Render MonsterShooter (adds attack range circle + bullets)
 */
export function renderMonsterShooter(monster: MonsterShooterLike, ctx: CanvasRenderingContext2D): void {
    renderMonster(monster, ctx);
    // MonsterShooter-specific: attack range circle
    new Circle(monster.pos.x, monster.pos.y, monster.rangeR).renderView(ctx);
    // Render bullets
    for (const b of monster.bullys) {
        b.render(ctx);
    }
}

/**
 * Render MonsterTerminator (adds scars)
 */
export function renderMonsterTerminator(monster: MonsterTerminatorLike, ctx: CanvasRenderingContext2D): void {
    renderMonster(monster, ctx);
    // MonsterTerminator-specific: scars
    for (const s of monster.scar) {
        s.render(ctx);
    }
}

// ============================================================================
// Export types for external use
// ============================================================================

// Types are exported directly from their interface definitions above
