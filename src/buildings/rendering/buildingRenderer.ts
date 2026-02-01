/**
 * BuildingRenderer - Rendering functions for Building
 * Extracted from Building class
 */
import { Circle } from '../../core/math/circle';
import { Vector } from '../../core/math/vector';
import {
    renderStatusBar,
    BAR_OFFSET,
    type StatusBarCache
} from '../../entities/statusBar';

// ============================================================================
// Type interfaces for loose coupling
// ============================================================================

interface BuildingLike {
    pos: Vector;
    r: number;
    hp: number;
    maxHp: number;
    hpBarHeight: number;
    hpColor: { r: number; g: number; b: number; a: number };
    _hpBarCache: StatusBarCache;

    // Healing range properties
    otherHpAddAble: boolean;
    otherHpAddRadius: number;

    // Methods
    isInScreen(): boolean;
    isDead(): boolean;
    getBodyCircle(): Circle;
}

// Cached healing range circle per building (keyed by object identity)
const _hpAddRangeCircles = new WeakMap<BuildingLike, Circle>();

// ============================================================================
// Core rendering functions
// ============================================================================

/**
 * Render building static parts (body circle + healing range)
 */
export function renderBuildingStatic(building: BuildingLike, ctx: CanvasRenderingContext2D): void {
    if (!building.isInScreen()) return;

    // Body circle
    const c = building.getBodyCircle();
    c.render(ctx);

    // Healing range circle
    if (building.otherHpAddAble) {
        let rangeCircle = _hpAddRangeCircles.get(building);
        if (!rangeCircle) {
            rangeCircle = new Circle(building.pos.x, building.pos.y, building.otherHpAddRadius);
            rangeCircle.fillColor.setRGBA(0, 0, 0, 0);
            rangeCircle.strokeColor.setRGBA(81, 139, 60, 1);
            rangeCircle.setStrokeWidth(0.5);
            _hpAddRangeCircles.set(building, rangeCircle);
        } else {
            rangeCircle.x = building.pos.x;
            rangeCircle.y = building.pos.y;
        }
        rangeCircle.render(ctx);
    }
}

/**
 * Render building dynamic parts (HP bar)
 */
export function renderBuildingDynamic(building: BuildingLike, ctx: CanvasRenderingContext2D): void {
    if (!building.isInScreen()) return;

    if (building.maxHp > 0 && !building.isDead()) {
        const barH = building.hpBarHeight;
        const barX = building.pos.x - building.r;
        const barY = building.pos.y - building.r + BAR_OFFSET.HP_TOP * barH;
        const barW = building.r * 2;
        const hpRate = building.hp / building.maxHp;

        renderStatusBar(ctx, {
            x: barX,
            y: barY,
            width: barW,
            height: barH,
            fillRate: hpRate,
            fillColor: building.hpColor,
            showText: true,
            textValue: building.hp,
            cache: building._hpBarCache
        });
    }
}

/**
 * Render complete building (static + dynamic)
 */
export function renderBuilding(building: BuildingLike, ctx: CanvasRenderingContext2D): void {
    renderBuildingStatic(building, ctx);
    renderBuildingDynamic(building, ctx);
}

// ============================================================================
// Export types
// ============================================================================

export type { BuildingLike as BuildingRenderable };
