/**
 * Bullet variants index - imports all variant files to register bullets
 */

// Import all variant files to trigger registration
import * as basic from './basic';
import * as machinegun from './machinegun';
import * as explosive from './explosive';
import * as penetrating from './penetrating';
import * as freeze from './freeze';
import * as split from './split';
import * as special from './special';

// Re-export all variants for direct access if needed
export {
    basic,
    machinegun,
    explosive,
    penetrating,
    freeze,
    split,
    special
};
