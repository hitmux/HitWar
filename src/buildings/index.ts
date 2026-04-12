/**
 * Buildings module exports
 *
 * Main entry point for the building system in ES modules.
 */

// Export registry
export { BuildingRegistry } from './buildingRegistry';

// Export base class
export { Building } from './building';

// Import variants to trigger registration (side effect)
import './variants/index';

// Re-export variant modules for direct access
export * as variants from './variants/index';

// Import BuildingRegistry for functions
import { BuildingRegistry } from './buildingRegistry';

type BuildingCreator = (world: unknown) => unknown;

/**
 * Get the array of all building creator functions
 * Equivalent to original BUILDING_FUNC_ARR
 */
export function getBuildingFuncArr(includeMultiplayerOnly: boolean = false): (BuildingCreator | undefined)[] {
    const buildingCreators: (BuildingCreator | undefined)[] = [
        // BuildingRegistry.getCreator('Root'),  // Root is not in UI selection
        BuildingRegistry.getCreator('Collector'),
        BuildingRegistry.getCreator('Treatment'),
    ];

    if (includeMultiplayerOnly) {
        buildingCreators.push(BuildingRegistry.getCreator('MonsterSpawner'));
    }

    return buildingCreators.filter(Boolean) as (BuildingCreator | undefined)[];
}

/**
 * Backward compatibility object - acts like BuildingFinally
 * Usage: BuildingFinally.Root(world) -> BuildingFinallyCompat.Root(world)
 */
export const BuildingFinallyCompat = new Proxy({} as Record<string, BuildingCreator | undefined>, {
    get(_target, prop) {
        if (typeof prop === 'string') {
            return BuildingRegistry.getCreator(prop);
        }
        return undefined;
    }
});
