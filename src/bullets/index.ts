/**
 * Bullets module exports
 *
 * Main entry point for the bullet system in ES modules.
 */

// Export registry
export { BulletRegistry } from './bulletRegistry';

// Export base class
export { Bullet } from './bullet';

// Import variants to trigger registration (side effect)
import './variants/index';

// Re-export variant modules for direct access
export * as variants from './variants/index';

// Import BulletRegistry for functions
import { BulletRegistry } from './bulletRegistry';

/**
 * Get the array of all bullet creator functions
 */
export function getBulletFuncArr(): ((() => unknown) | null)[] {
    return [
        // Basic bullets
        BulletRegistry.getCreator('Normal'),
        BulletRegistry.getCreator('littleStone'),
        BulletRegistry.getCreator('Arrow'),
        BulletRegistry.getCreator('Arrow_L'),
        BulletRegistry.getCreator('Arrow_LL'),
        BulletRegistry.getCreator('CannonStone_S'),
        BulletRegistry.getCreator('CannonStone_M'),
        BulletRegistry.getCreator('CannonStone_L'),
        BulletRegistry.getCreator('Bullet_S'),
        BulletRegistry.getCreator('Bullet_M'),
        BulletRegistry.getCreator('Bullet_L'),
        BulletRegistry.getCreator('Rifle_Bullet_S'),
        BulletRegistry.getCreator('Rifle_Bullet_M'),
        BulletRegistry.getCreator('Rifle_Bullet_L'),
        // Machine gun bullets
        BulletRegistry.getCreator('F_S'),
        BulletRegistry.getCreator('F_M'),
        BulletRegistry.getCreator('F_L'),
        // Explosive bullets
        BulletRegistry.getCreator('H_S'),
        BulletRegistry.getCreator('H_L'),
        BulletRegistry.getCreator('H_LL'),
        BulletRegistry.getCreator('H_Target_S'),
        // Penetrating bullets
        BulletRegistry.getCreator('T_M'),
        BulletRegistry.getCreator('T_L'),
        BulletRegistry.getCreator('T_LL'),
        // Freeze bullets
        BulletRegistry.getCreator('Frozen_S'),
        BulletRegistry.getCreator('Frozen_M'),
        BulletRegistry.getCreator('Frozen_L'),
        // Split bullets
        BulletRegistry.getCreator('SS_S'),
        BulletRegistry.getCreator('SS_M'),
        BulletRegistry.getCreator('SS_L'),
        BulletRegistry.getCreator('SS_Second'),
        BulletRegistry.getCreator('SS_Third'),
        BulletRegistry.getCreator('SpikeBullet'),
        BulletRegistry.getCreator('CactusNeedle'),
        // Special bullets
        BulletRegistry.getCreator('S'),
        BulletRegistry.getCreator('R_M'),
        BulletRegistry.getCreator('Powder'),
        BulletRegistry.getCreator('Fire_M'),
        BulletRegistry.getCreator('Fire_L'),
        BulletRegistry.getCreator('Fire_LL'),
        BulletRegistry.getCreator('P_L'),
        BulletRegistry.getCreator('P_M'),
        BulletRegistry.getCreator('ThunderBall'),
    ].filter(Boolean) as ((() => unknown) | null)[];
}
