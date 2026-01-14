/**
 * Monsters module exports
 *
 * Main entry point for the monster system in ES modules.
 */

// Export registry
export { MonsterRegistry } from './monsterRegistry';

// Export constants
export {
    MONSTER_IMG_PRE_WIDTH,
    MONSTER_IMG_PRE_HEIGHT,
    getMonstersImg,
    initMonstersImg
} from './monsterConstants';

// Export base classes
export {
    Monster,
    MonsterShooter,
    MonsterMortis,
    MonsterTerminator
} from './base/index';

// Export MonsterGroup
export {
    MonsterGroup,
    MonsterEasyArr,
    Monster10BeforeArr,
    MonsterAllArr
} from './monsterGroup';

// Import variants to trigger registration (side effect)
import './variants/index';

// Re-export variant modules for direct access
export * as variants from './variants/index';

// Export AI modules
export * as ai from './ai/index';

// Import MonsterRegistry for re-exporting functions
import { MonsterRegistry } from './monsterRegistry';

type MonsterCreator = (...args: unknown[]) => unknown;

/**
 * Get the array of all monster creator functions
 * Equivalent to the original MONSTERS_FUNC_ARR_ALL
 */
export function getMonsterFuncArr(): (MonsterCreator | undefined)[] {
    return [
        MonsterRegistry.getCreator('Ox1'),
        MonsterRegistry.getCreator('Ox2'),
        MonsterRegistry.getCreator('Ox3'),
        MonsterRegistry.getCreator('Runner'),
        MonsterRegistry.getCreator('Bomber1'),
        MonsterRegistry.getCreator('Bomber2'),
        MonsterRegistry.getCreator('Bomber3'),
        MonsterRegistry.getCreator('Thrower1'),
        MonsterRegistry.getCreator('BlackHole'),
        MonsterRegistry.getCreator('Bulldozer'),
        MonsterRegistry.getCreator('Glans'),
        MonsterRegistry.getCreator('Medic'),
        MonsterRegistry.getCreator('Medic_M'),
        MonsterRegistry.getCreator('Medic_S'),
        MonsterRegistry.getCreator('AttackAdder'),
        MonsterRegistry.getCreator('SpeedAdder'),
        MonsterRegistry.getCreator('BulletWearer'),
        MonsterRegistry.getCreator('BulletRepellent'),
        MonsterRegistry.getCreator('DamageReducers'),
        MonsterRegistry.getCreator('Shouter'),
        MonsterRegistry.getCreator('Shouter_Stone'),
        MonsterRegistry.getCreator('Shouter_Bomber'),
        MonsterRegistry.getCreator('Shouter_Spike'),
        MonsterRegistry.getCreator('Slime_L'),
        MonsterRegistry.getCreator('witch_N'),
        MonsterRegistry.getCreator('bat'),
        MonsterRegistry.getCreator('Spoke'),
        MonsterRegistry.getCreator('SpokeMan'),
        MonsterRegistry.getCreator('Exciting'),
        MonsterRegistry.getCreator('Visitor'),
        MonsterRegistry.getCreator('Enderman'),
        MonsterRegistry.getCreator('Mts'),
        MonsterRegistry.getCreator('T800'),
        MonsterRegistry.getCreator('Normal'),
        MonsterRegistry.getCreator('TestMonster'),
    ].filter(Boolean) as (MonsterCreator | undefined)[];
}

/**
 * Backward compatibility object - acts like MonsterFinally
 * Usage: MonsterFinally.T800(world) -> MonsterFinallyCompat.T800(world)
 */
export const MonsterFinallyCompat = new Proxy({} as Record<string, MonsterCreator | undefined>, {
    get(_target, prop) {
        if (typeof prop === 'string') {
            return MonsterRegistry.getCreator(prop);
        }
        return undefined;
    }
});
