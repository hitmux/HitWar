/**
 * Monster image constants
 */

// Declare global for compat with non-migrated code (same pattern as towers)
declare const MONSTER_IMG: HTMLImageElement | undefined;

// Image dimensions for monster sprite sheet
export const MONSTER_IMG_PRE_WIDTH = 100;
export const MONSTER_IMG_PRE_HEIGHT = 100;

// Monster sprite sheet image - initialized at runtime
let _monstersImg: HTMLImageElement | null = null;

/**
 * Get the monsters sprite sheet image
 * Uses global MONSTER_IMG as fallback (same pattern as towers)
 */
export function getMonstersImg(): HTMLImageElement | null {
    if (!_monstersImg && typeof MONSTER_IMG !== 'undefined') {
        _monstersImg = MONSTER_IMG;
    }
    return _monstersImg;
}

/**
 * Set the monsters sprite sheet image (called during game setup)
 */
export function setMonstersImg(img: HTMLImageElement): void {
    _monstersImg = img;
}

/**
 * Initialize monsters image (alias for setMonstersImg for backwards compatibility)
 */
export function initMonstersImg(img?: HTMLImageElement): HTMLImageElement | null {
    if (img) {
        _monstersImg = img;
    }
    return _monstersImg;
}
