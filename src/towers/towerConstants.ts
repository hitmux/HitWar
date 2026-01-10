/**
 * Tower constants shared across tower modules
 *
 * These will be populated at runtime from global scope during migration,
 * then fully integrated once all modules are migrated.
 */

// Declare global for compat with non-migrated code
declare const TOWERS_IMG: HTMLImageElement | undefined;

// Image constants
export const TOWER_IMG_WIDTH = 1000;
export const TOWER_IMG_HEIGHT = 1000;
export const TOWER_IMG_PRE_WIDTH = 100;
export const TOWER_IMG_PRE_HEIGHT = 100;

// Tower sprite image - initialized at runtime
let _towersImg: HTMLImageElement | null = null;

/**
 * Get the towers sprite image
 * Uses global TOWERS_IMG until assets module is fully migrated
 */
export function getTowersImg(): HTMLImageElement | null {
    if (!_towersImg && typeof TOWERS_IMG !== 'undefined') {
        _towersImg = TOWERS_IMG;
    }
    return _towersImg;
}

/**
 * Initialize towers image (called during game setup)
 */
export function initTowersImg(img: HTMLImageElement): void {
    _towersImg = img;
}
