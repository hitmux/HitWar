/**
 * Shared Vision Configuration
 * Used by both server and client for vision calculations.
 * Client-only rendering params remain in src/systems/fog/visionConfig.ts.
 */

/** Vision type enum - shared between server and client */
export enum VisionType {
    NONE = 'none',
    OBSERVER = 'observer',
    RADAR = 'radar'
}

// --- Basic vision radii ---
export const HEADQUARTERS_VISION = 200;
export const BASIC_TOWER_VISION = 120;

// --- Observer tower config ---
export const OBSERVER_RADIUS: Record<number, number> = { 1: 180, 2: 250, 3: 350 };
export const OBSERVER_PRICE: Record<number, number> = { 1: 60, 2: 120, 3: 180 };
export const OBSERVER_MAX_LEVEL = 3;

// --- Radar tower config ---
export const RADAR_RADIUS: Record<number, number> = { 1: 300, 2: 550, 3: 800, 4: 1050, 5: 1300 };
export const RADAR_PRICE: Record<number, number> = { 1: 100, 2: 150, 3: 200, 4: 250, 5: 300 };
export const RADAR_MAX_LEVEL = 5;
export const RADAR_SWEEP_ANGLE = Math.PI / 6;  // 30 degree sweep width
export const RADAR_SWEEP_SPEED = 0.03;         // Rotation speed (rad/frame)

/**
 * Get vision radius for given type and level.
 * Returns basic tower vision for NONE or unknown types.
 */
export function getVisionRadius(type: VisionType | string, level: number): number {
    switch (type) {
        case VisionType.OBSERVER:
            return OBSERVER_RADIUS[level] || BASIC_TOWER_VISION;
        case VisionType.RADAR: {
            if (RADAR_RADIUS[level] !== undefined) {
                return RADAR_RADIUS[level];
            }
            const maxLevel = Math.max(...Object.keys(RADAR_RADIUS).map(Number));
            return RADAR_RADIUS[maxLevel] || BASIC_TOWER_VISION;
        }
        default:
            return BASIC_TOWER_VISION;
    }
}

/**
 * Get price for upgrading to next vision level.
 * Returns 0 if upgrade is not possible.
 */
export function getVisionUpgradePrice(
    currentType: VisionType | string,
    currentLevel: number,
    targetType: VisionType | string
): number {
    const nextLevel = currentType === targetType ? currentLevel + 1 : 1;
    if (targetType === VisionType.OBSERVER) {
        return OBSERVER_PRICE[nextLevel] || 0;
    } else if (targetType === VisionType.RADAR) {
        return RADAR_PRICE[nextLevel] || 0;
    }
    return 0;
}

/**
 * Check if a tower can upgrade its vision to the specified type.
 * Returns false if the tower already has a different vision type,
 * or if the tower is already at max level for this type.
 */
export function canUpgradeVision(
    currentType: VisionType | string,
    currentLevel: number,
    targetType: VisionType | string
): boolean {
    if (currentType !== VisionType.NONE && currentType !== targetType) {
        return false;
    }
    const maxLevel = targetType === VisionType.OBSERVER ? OBSERVER_MAX_LEVEL : RADAR_MAX_LEVEL;
    return currentLevel < maxLevel;
}
