/**
 * Core module exports
 */

// Math utilities
export { Vector, Circle, Line, Rectangle } from './math/index';

// Physics
export { QuadTree, Obstacle } from './physics/index';

// Input handling
export { InputHandler } from './input/index';

// Camera
export { Camera } from './camera';

// Game balance functions
export { Functions } from './functions';

// Static initialization and canvas utilities
export { PR, standardize, drawLine, drawRectStroke, drawRectFill, writeFont } from './staticInitData';

// Registry base class
export { BaseRegistry, type Creator, type ClassGetter } from './registry/index';
