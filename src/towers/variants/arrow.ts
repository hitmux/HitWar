/**
 * Arrow tower variants
 *
 * Contains: ArrowBow_1~4, Crossbow_1~3 (7 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    ARROW_TOWER_CONFIGS,
    ARROWBOW_1_CONFIG,
    ARROWBOW_2_CONFIG,
    ARROWBOW_3_CONFIG,
    ARROWBOW_4_CONFIG,
    CROSSBOW_1_CONFIG,
    CROSSBOW_2_CONFIG,
    CROSSBOW_3_CONFIG
} from '../config/arrowTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function ArrowBow_1(world: WorldLike): Tower {
    return createTowerFromConfig(ARROWBOW_1_CONFIG, world);
}

export function ArrowBow_2(world: WorldLike): Tower {
    return createTowerFromConfig(ARROWBOW_2_CONFIG, world);
}

export function ArrowBow_3(world: WorldLike): Tower {
    return createTowerFromConfig(ARROWBOW_3_CONFIG, world);
}

export function ArrowBow_4(world: WorldLike): Tower {
    return createTowerFromConfig(ARROWBOW_4_CONFIG, world);
}

export function Crossbow_1(world: WorldLike): Tower {
    return createTowerFromConfig(CROSSBOW_1_CONFIG, world);
}

export function Crossbow_2(world: WorldLike): Tower {
    return createTowerFromConfig(CROSSBOW_2_CONFIG, world);
}

export function Crossbow_3(world: WorldLike): Tower {
    return createTowerFromConfig(CROSSBOW_3_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(ARROW_TOWER_CONFIGS as TowerConfig[]);
