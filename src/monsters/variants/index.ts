/**
 * Monster variants index - imports all variant files to register monsters
 */

// Import all variant files to trigger registration
import * as basic from './basic';
import * as bomber from './bomber';
import * as support from './support';
import * as defender from './defender';
import * as shouter from './shouter';
import * as slime from './slime';
import * as special from './special';
import * as elite from './elite';

// Re-export all variants for direct access if needed
export {
    basic,
    bomber,
    support,
    defender,
    shouter,
    slime,
    special,
    elite
};
