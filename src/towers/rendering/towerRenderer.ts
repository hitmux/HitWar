/**
 * TowerRenderer - Rendering functions for Tower and its subclasses
 * Extracted from Tower, TowerLaser, TowerHammer, TowerRay, TowerBoomerang
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { Line } from '../../core/math/line';
import { MyColor } from '../../entities/myColor';
import { scalePeriod } from '../../core/speedScale';
import {
    renderStatusBar,
    BAR_OFFSET,
    BAR_COLORS,
    type StatusBarCache
} from '../../entities/statusBar';
import { getTowersImg, TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT } from '../towerConstants';

// Declare globals for non-migrated modules
declare const UP_LEVEL_ICON: HTMLImageElement | undefined;

// ============================================================================
// Type interfaces for loose coupling
// ============================================================================

interface Renderable {
    render(ctx: CanvasRenderingContext2D): void;
}

interface CircleObjectLike {
    pos: Vector;
    r: number;
    hp: number;
    maxHp: number;
    hpBarHeight: number;
    hpColor: { r: number; g: number; b: number; a: number };
    _hpBarCache: StatusBarCache;
    liveTime: number;

    isInScreen(): boolean;
    isDead(): boolean;
    getBodyCircle(): Circle;
}

interface TowerLike extends CircleObjectLike {
    imgIndex: number;
    selected: boolean;
    bullys: Set<Renderable>;
    _upIconOffset: Vector | null;

    getImgStartPosByIndex(n: number): Vector;
    getViewCircle(): Circle;
    isUpLevelAble(): boolean;
}

interface TowerLaserLike extends TowerLike {
    laserFreezeNow: number;
    laserFreezeMax: number;
    laserDamageAdd: number;
    laserMaxDamage: number;
    _cooldownBarCache: StatusBarCache;
    _chargeBarCache: StatusBarCache;
}

interface TowerHammerLike extends TowerLike {
    additionItem: CircleObjectLike & Renderable & { pos: Vector; bodyColor: MyColor };
}

interface TowerRayLike extends TowerLike {
    rayBullys: Set<Renderable>;
}

interface TowerBoomerangLike extends TowerLike {
    bar: Line & { strokeColor: MyColor; getCenter(): Vector };
}

// ============================================================================
// Core rendering functions
// ============================================================================

/**
 * Render tower body circle + sprite image
 */
export function renderTowerBody(tower: TowerLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;

    // Base circle
    const c = tower.getBodyCircle();
    c.render(ctx);

    // Sprite image
    const TOWERS_IMG = getTowersImg();
    const imgStartPos = tower.getImgStartPosByIndex(tower.imgIndex);
    if (TOWERS_IMG) {
        ctx.drawImage(
            TOWERS_IMG,
            imgStartPos.x,
            imgStartPos.y,
            TOWER_IMG_PRE_WIDTH,
            TOWER_IMG_PRE_HEIGHT,
            tower.pos.x - tower.r,
            tower.pos.y - tower.r,
            tower.r * 2,
            tower.r * 2,
        );
    }

    // Selection range circle
    if (!tower.isDead() && tower.selected) {
        tower.getViewCircle().renderView(ctx);
    }

    // Render bullets
    for (const b of tower.bullys) {
        b.render(ctx);
    }

    // Upgrade icon
    if (tower.isUpLevelAble()) {
        if (!tower._upIconOffset) {
            tower._upIconOffset = new Vector(0, 0);
        }
        tower._upIconOffset.x = tower.pos.x + tower.r * 0.2;
        tower._upIconOffset.y = tower.pos.y - tower.r * 1.5 + Math.sin(tower.liveTime / scalePeriod(15)) * 5;
        if (typeof UP_LEVEL_ICON !== 'undefined') {
            ctx.drawImage(
                UP_LEVEL_ICON,
                0, 0, 100, 100,
                tower._upIconOffset.x,
                tower._upIconOffset.y,
                20, 20
            );
        }
    }
}

/**
 * Render tower HP bar (from CircleObject base)
 */
export function renderTowerBars(tower: TowerLike, ctx: CanvasRenderingContext2D): void {
    if (!tower.isInScreen()) return;
    if (tower.maxHp > 0 && !tower.isDead()) {
        const barH = tower.hpBarHeight;
        const barX = tower.pos.x - tower.r;
        const barY = tower.pos.y - tower.r + BAR_OFFSET.HP_TOP * barH;
        const barW = tower.r * 2;
        const hpRate = tower.hp / tower.maxHp;

        renderStatusBar(ctx, {
            x: barX,
            y: barY,
            width: barW,
            height: barH,
            fillRate: hpRate,
            fillColor: tower.hpColor,
            showText: true,
            textValue: tower.hp,
            cache: tower._hpBarCache
        });
    }
}

// ============================================================================
// Subclass-specific rendering
// ============================================================================

/**
 * Render TowerLaser bars (HP bar + cooldown + charge)
 */
export function renderTowerLaserBars(tower: TowerLaserLike, ctx: CanvasRenderingContext2D): void {
    // HP bar
    renderTowerBars(tower, ctx);

    const barH = tower.hpBarHeight;
    const barX = tower.pos.x - tower.r;
    const barW = tower.r * 2;

    // Cooldown bar
    const cooldownY = tower.pos.y + tower.r + BAR_OFFSET.BOTTOM_1 * barH;
    const cooldownRate = tower.laserFreezeNow / tower.laserFreezeMax;
    renderStatusBar(ctx, {
        x: barX,
        y: cooldownY,
        width: barW,
        height: barH,
        fillRate: cooldownRate,
        fillColor: BAR_COLORS.COOLDOWN,
        cache: tower._cooldownBarCache
    });

    // Charge bar
    const chargeY = tower.pos.y + tower.r + BAR_OFFSET.BOTTOM_2 * barH;
    const chargeRate = tower.laserDamageAdd / tower.laserMaxDamage;
    renderStatusBar(ctx, {
        x: barX,
        y: chargeY,
        width: barW,
        height: barH,
        fillRate: chargeRate,
        fillColor: BAR_COLORS.CHARGE,
        cache: tower._chargeBarCache
    });
}

/**
 * Render TowerHammer extra (hammer item + connecting line)
 */
export function renderTowerHammerExtra(tower: TowerHammerLike, ctx: CanvasRenderingContext2D): void {
    tower.additionItem.render(ctx);
    const line = new Line(tower.pos, tower.additionItem.pos);
    line.strokeWidth = 10;
    line.strokeColor = tower.additionItem.bodyColor;
    line.render(ctx);
}

/**
 * Render TowerRay extra (ray bullets)
 */
export function renderTowerRayExtra(tower: TowerRayLike, ctx: CanvasRenderingContext2D): void {
    for (const b of tower.rayBullys) {
        b.render(ctx);
    }
}

/**
 * Render TowerBoomerang extra (boomerang bar + connecting line)
 */
export function renderTowerBoomerangExtra(tower: TowerBoomerangLike, ctx: CanvasRenderingContext2D): void {
    tower.bar.render(ctx);
    const line = new Line(tower.pos, tower.bar.getCenter());
    line.strokeWidth = 0.1;
    line.strokeColor = tower.bar.strokeColor;
    line.render(ctx);
}

// ============================================================================
// Composite rendering functions
// ============================================================================

/**
 * Render complete Tower (base class)
 */
export function renderTower(tower: TowerLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;
    renderTowerBody(tower, ctx);
    renderTowerBars(tower, ctx);
}

/**
 * Render complete TowerLaser
 */
export function renderTowerLaser(tower: TowerLaserLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;
    renderTowerBody(tower, ctx);
    renderTowerLaserBars(tower, ctx);
}

/**
 * Render complete TowerHammer
 */
export function renderTowerHammer(tower: TowerHammerLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;
    // Body + hammer item
    renderTowerBody(tower, ctx);
    renderTowerHammerExtra(tower, ctx);
    // Bars (base)
    renderTowerBars(tower, ctx);
}

/**
 * Render complete TowerRay
 */
export function renderTowerRay(tower: TowerRayLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;
    renderTowerBody(tower, ctx);
    renderTowerRayExtra(tower, ctx);
    renderTowerBars(tower, ctx);
}

/**
 * Render complete TowerBoomerang
 */
export function renderTowerBoomerang(tower: TowerBoomerangLike, ctx: CanvasRenderingContext2D): void {
    if (tower.isDead()) return;
    // Boomerang renders bar BEFORE body (order matters)
    renderTowerBoomerangExtra(tower, ctx);
    renderTowerBody(tower, ctx);
    renderTowerBars(tower, ctx);
}

// ============================================================================
// Export types
// ============================================================================

export type {
    TowerLike as TowerRenderable,
    TowerLaserLike as TowerLaserRenderable,
    TowerHammerLike as TowerHammerRenderable,
    TowerRayLike as TowerRayRenderable,
    TowerBoomerangLike as TowerBoomerangRenderable,
};
