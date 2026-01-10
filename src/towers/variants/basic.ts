/**
 * Basic tower variants
 *
 * Contains: BasicCannon, AncientCannon (2 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import { BASIC_TOWER_CONFIGS, BASIC_CANNON_CONFIG, ANCIENT_CANNON_CONFIG } from '../config/basicTowers';
import type { DynamicPriceTowerConfig, TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
    cheatMode?: {
        enabled: boolean;
        priceMultiplier: number;
    };
}

/**
 * BasicCannon - The most basic tower type
 * Exported for backward compatibility
 */
export function BasicCannon(world: WorldLike): Tower {
    return createTowerFromConfig(BASIC_CANNON_CONFIG, world);
}

/**
 * AncientCannon - Medieval style tower
 * Exported for backward compatibility
 */
export function AncientCannon(world: WorldLike): Tower {
    return createTowerFromConfig(ANCIENT_CANNON_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(BASIC_TOWER_CONFIGS as (TowerConfig | DynamicPriceTowerConfig)[]);
