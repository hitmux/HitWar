/**
 * Towers module exports
 *
 * Main entry point for the tower system in ES modules.
 */

// Export registry
export { TowerRegistry } from './towerRegistry';

// Export constants
export {
    TOWER_IMG_WIDTH,
    TOWER_IMG_HEIGHT,
    TOWER_IMG_PRE_WIDTH,
    TOWER_IMG_PRE_HEIGHT,
    getTowersImg,
    initTowersImg
} from './towerConstants';

// Export base classes
export {
    Tower,
    TowerLaser,
    TowerHell,
    TowerHammer,
    TowerBoomerang,
    TowerRay
} from './base/index';

// Import variants to trigger registration (side effect)
import './variants/index';

// Re-export variant modules for direct access
export * as variants from './variants/index';

// TOWER_FUNC_ARR - List of common tower creators for UI
// This will be populated after all towers are registered
import { TowerRegistry } from './towerRegistry';

/**
 * Backward compatibility object - acts like TowerFinally
 * Usage: TowerFinally.BasicCannon(world) -> TowerFinallyCompat.BasicCannon(world)
 */
export const TowerFinallyCompat = new Proxy({}, {
    get(target, prop) {
        if (typeof prop === 'string') {
            return TowerRegistry.getCreator(prop);
        }
        return undefined;
    }
});

/**
 * Get the array of tower creator functions for UI
 * This returns the same towers that were in the original TOWER_FUNC_ARR
 */
export function getTowerFuncArr() {
    return [
        TowerRegistry.getCreator('BasicCannon'),
        TowerRegistry.getCreator('MachineGun_1'),
        TowerRegistry.getCreator('MachineGun_2'),
        TowerRegistry.getCreator('MachineGun_3'),

        TowerRegistry.getCreator('Artillery_1'),
        TowerRegistry.getCreator('Artillery_2'),
        TowerRegistry.getCreator('Artillery_3'),

        TowerRegistry.getCreator('MissileGun_1'),

        TowerRegistry.getCreator('Shotgun_1'),

        TowerRegistry.getCreator('ShotCannon_1'),
        TowerRegistry.getCreator('ShotCannon_2'),

        TowerRegistry.getCreator('ArmorPiercing_1'),
        TowerRegistry.getCreator('ArmorPiercing_2'),
        TowerRegistry.getCreator('ArmorPiercing_3'),

        TowerRegistry.getCreator('FrozenCannon_1'),
        TowerRegistry.getCreator('FrozenCannon_2'),

        TowerRegistry.getCreator('SprayCannon_1'),
        TowerRegistry.getCreator('SprayCannon_2'),
        TowerRegistry.getCreator('SprayCannon_3'),
        TowerRegistry.getCreator('SprayCannon_Double'),

        TowerRegistry.getCreator('Flamethrower_1'),
        TowerRegistry.getCreator('Flamethrower_2'),

        TowerRegistry.getCreator('Poison_1'),
        TowerRegistry.getCreator('Poison_2'),

        TowerRegistry.getCreator('FutureCannon_2'),

        TowerRegistry.getCreator('Laser_Hell_1'),

        TowerRegistry.getCreator('Laser_Red'),

        TowerRegistry.getCreator('Earthquake'),
        TowerRegistry.getCreator('Thunder_1'),

        TowerRegistry.getCreator('Hammer'),
        TowerRegistry.getCreator('Boomerang'),

        TowerRegistry.getCreator('ThunderBall_1'),
        TowerRegistry.getCreator('AirCannon_1'),
    ].filter(Boolean);
}
