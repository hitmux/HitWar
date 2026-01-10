/**
 * Tower variants index - imports all variant files to register towers
 *
 * Each variant file auto-registers its towers to TowerRegistry on import.
 */

// Import all variant files to trigger registration
import * as basic from './basic';
import * as traditional from './traditional';
import * as future from './future';
import * as boomerang from './boomerang';
import * as hammer from './hammer';
import * as stone from './stone';
import * as arrow from './arrow';
import * as gun from './gun';
import * as artillery from './artillery';
import * as air from './air';
import * as earthquake from './earthquake';
import * as elemental from './elemental';
import * as spray from './spray';
import * as shot from './shot';
import * as thunder from './thunder';
import * as laser from './laser';

// Re-export all variants for direct access if needed
export {
    basic,
    traditional,
    future,
    boomerang,
    hammer,
    stone,
    arrow,
    gun,
    artillery,
    air,
    earthquake,
    elemental,
    spray,
    shot,
    thunder,
    laser
};
