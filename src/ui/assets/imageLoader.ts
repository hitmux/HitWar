/**
 * Image resource loader
 */

// Preloaded images
export const UP_LEVEL_ICON = new Image();
export const TOWER_IMG = new Image();
export const MONSTER_IMG = new Image();

// Helper: respect Vite base (fixes asset loading on sub-path deploys)
const assetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL ?? "/";
    return `${base}${path.replace(/^\//, "")}`;
};

/**
 * Load all game images
 * @returns Promise that resolves when all images are loaded
 */
export function loadAllImages(): Promise<void> {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalImages = 3;

        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
                resolve();
            }
        };

        UP_LEVEL_ICON.onload = checkAllLoaded;
        UP_LEVEL_ICON.onerror = checkAllLoaded;
        UP_LEVEL_ICON.src = assetUrl("/icon/icon_upgrade.png");

        TOWER_IMG.onload = checkAllLoaded;
        TOWER_IMG.onerror = checkAllLoaded;
        TOWER_IMG.src = assetUrl("/towers/imgs/towers.png");

        MONSTER_IMG.onload = checkAllLoaded;
        MONSTER_IMG.onerror = checkAllLoaded;
        MONSTER_IMG.src = assetUrl("/monster/imgs/monsters.png");
    });
}
