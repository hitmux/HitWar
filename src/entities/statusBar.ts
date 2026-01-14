/**
 * StatusBar - Unified status bar rendering utility
 * Consolidates HP bars, cooldown bars, charge bars, laser defense bars, etc.
 */
import { Rectangle } from '../core/math/rectangle';

const FONT_9 = "9px Microsoft YaHei";

/**
 * Cache structure for status bar rendering (avoids GC pressure)
 */
export interface StatusBarCache {
    border: Rectangle | null;
    fill: Rectangle | null;
    lastValueInt: number;
    valueStr: string;
}

/**
 * Create empty status bar cache
 */
export function createStatusBarCache(): StatusBarCache {
    return {
        border: null,
        fill: null,
        lastValueInt: -1,
        valueStr: ""
    };
}

/**
 * Color specification for status bar fill
 */
export interface StatusBarColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * Options for rendering a status bar
 */
export interface StatusBarOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    fillRate: number;
    fillColor: StatusBarColor;
    showText?: boolean;
    textValue?: number;
    cache: StatusBarCache;
}

/**
 * Render a status bar with border and fill
 * Uses cached Rectangle objects to avoid GC pressure
 */
export function renderStatusBar(ctx: CanvasRenderingContext2D, options: StatusBarOptions): void {
    const { x, y, width, height, fillRate, fillColor, showText, textValue, cache } = options;

    // Render border
    if (!cache.border) {
        cache.border = new Rectangle(x, y, width, height);
        cache.border.setStrokeWidth(1);
        cache.border.setFillColor(0, 0, 0, 0);
        cache.border.setStrokeColor(1, 1, 1);
    } else {
        cache.border.pos.x = x;
        cache.border.pos.y = y;
        cache.border.width = width;
        cache.border.height = height;
    }
    cache.border.render(ctx);

    // Clear the inner area of the bar to avoid old fill persisting
    // Offset by 1px to avoid clearing the border stroke
    ctx.clearRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height - 2));

    // Render fill
    const fillWidth = width * fillRate;
    if (!cache.fill) {
        cache.fill = new Rectangle(x, y, fillWidth, height);
        cache.fill.setStrokeWidth(0);
        cache.fill.setFillColor(fillColor.r, fillColor.g, fillColor.b, fillColor.a);
    } else {
        cache.fill.pos.x = x;
        cache.fill.pos.y = y;
        cache.fill.width = fillWidth;
        cache.fill.height = height;
        cache.fill.setFillColor(fillColor.r, fillColor.g, fillColor.b, fillColor.a);
    }
    cache.fill.render(ctx);

    // Render text if needed
    if (showText && textValue !== undefined) {
        const valueInt = Math.floor(textValue);
        if (valueInt !== cache.lastValueInt) {
            cache.lastValueInt = valueInt;
            cache.valueStr = valueInt.toString();
        }
        ctx.fillStyle = "black";
        ctx.font = FONT_9;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(cache.valueStr, x + width / 2, y + 1);
    }
}

/**
 * Calculate status bar position relative to entity center
 */
export function calcBarPosition(
    entityX: number,
    entityY: number,
    entityR: number,
    barHeight: number,
    yOffset: number
): { x: number; y: number; width: number } {
    return {
        x: entityX - entityR,
        y: entityY + yOffset * barHeight,
        width: entityR * 2
    };
}

// Common Y offset constants (relative to barHeight)
export const BAR_OFFSET = {
    HP_TOP: -2.5,           // HP bar above entity: y = pos.y - r - 2.5 * barH
    BOTTOM_1: 2.5,          // First bar below entity
    BOTTOM_2: 3.8,          // Second bar below entity
    LASER_DEFENSE: -4       // Laser defense bar (above HP bar)
} as const;

// Common colors
export const BAR_COLORS = {
    COOLDOWN: { r: 0, g: 12, b: 200, a: 0.5 },
    CHARGE: { r: 255, g: 1, b: 255, a: 0.5 },
    LASER_DEFENSE: { r: 255, g: 0, b: 255, a: 0.5 }
} as const;
