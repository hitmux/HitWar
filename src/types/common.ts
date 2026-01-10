/**
 * Common types used throughout the game
 */

// Canvas rendering context type alias
export type RenderContext = CanvasRenderingContext2D;

// Color array type [r, g, b, a]
export type ColorArray = [number, number, number, number];

// Game entity type identifiers
export type GameType =
  | 'CircleObject'
  | 'Tower'
  | 'Monster'
  | 'Bully'
  | 'Building'
  | 'Effect';

// Generic callback types
export type VoidCallback = () => void;
export type TickCallback = (deltaTime: number) => void;

// Position-like object
export interface IPosition {
  x: number;
  y: number;
}

// Size dimensions
export interface ISize {
  width: number;
  height: number;
}

// Bounds for collision detection
export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Generic creator function type for registries
export type EntityCreator<T> = (...args: unknown[]) => T;

// Registry interface for entity type management
export interface IRegistry<T> {
  register(name: string, creator: EntityCreator<T>, classType?: new (...args: unknown[]) => T): void;
  create(name: string, ...args: unknown[]): T;
  has(name: string): boolean;
  getNames(): string[];
  getCreator(name: string): EntityCreator<T> | undefined;
  getClassType(name: string): (new (...args: unknown[]) => T) | undefined;
}

// Save data structure
export interface ISaveData {
  version?: string;
  timestamp?: number;
  [key: string]: unknown;
}

// Event handler types
export type MouseEventHandler = (event: MouseEvent) => void;
export type TouchEventHandler = (event: TouchEvent) => void;
export type KeyboardEventHandler = (event: KeyboardEvent) => void;
