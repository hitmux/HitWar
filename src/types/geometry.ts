/**
 * Geometry types for Vector, Circle, Line, Rectangle
 */

import type { RenderContext, IPosition } from './common';

// Vector interface
export interface IVector extends IPosition {
  x: number;
  y: number;

  // Methods
  copy(): IVector;
  add(v: IVector): IVector;
  sub(v: IVector): IVector;
  mul(n: number): IVector;
  plus(v: IVector): IVector;
  abs(): number;
  dis(v: IVector): number;
  to1(): IVector;
  toTheta(): number;
  rotate(theta: number): IVector;
  rotate90(): IVector;
  rotatePoint(center: IVector, theta: number): IVector;
  deviation(theta: number): IVector;
  zero(): IVector;
  toString(): string;

  // Static-like methods (called on instance)
  randCircle(r: number): IVector;
  randCircleOutside(rMin: number, rMax: number): IVector;
  randRectBrim(w: number, h: number): IVector;
}

// Circle interface
export interface ICircle {
  x: number;
  y: number;
  r: number;
  pos: IVector;
  strokeWidth: number;
  strokeColor: IColor;
  fillColor: IColor;

  // Methods
  pointIn(p: IVector): boolean;
  impact(other: ICircle): boolean;
  render(ctx: RenderContext): void;
  renderView(ctx: RenderContext): void;
  setStrokeWidth(width: number): void;
}

// Line interface
export interface ILine {
  PosStart: IVector;
  PosEnd: IVector;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  strokeColor: IColor;
  strokeWidth: number;

  // Methods
  getCenter(): IVector;
  move(v: IVector): void;
  moveTo(p: IVector): void;
  resetLine(p1: IVector, p2: IVector): void;
  intersectWithCircle(circle: ICircle): boolean;
  render(ctx: RenderContext): void;
}

// Rectangle interface
export interface IRectangle {
  pos: IVector;
  width: number;
  height: number;
  strokeWidth: number;
  color: string;
  strokeColor: string;

  // Methods
  render(ctx: RenderContext): void;
  setFillColor(color: string): void;
  setStrokeColor(color: string): void;
  setStrokeWidth(width: number): void;
}

// Readonly color interface (for shared immutable instances)
export interface IReadonlyColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;

  // Read-only methods
  toStringRGBA(): string;
  toStringRGB(): string;
  toArr(): [number, number, number, number];
}

// Mutable color interface (MyColor class)
export interface IColor extends IReadonlyColor {
  r: number;
  g: number;
  b: number;
  a: number;

  // Mutation methods
  setRGB(r: number, g: number, b: number): void;
  setRGBA(r: number, g: number, b: number, a: number): void;
  change(dr: number, dg: number, db: number, da: number): void;
  changeAlpha(newAlpha: number): void;
}

// Constructor types for geometry classes
export type VectorConstructor = new (x: number, y: number) => IVector;
export type CircleConstructor = new (x: number, y: number, r: number) => ICircle;
export type LineConstructor = new (p1: IVector, p2: IVector) => ILine;
export type RectangleConstructor = new (x: number, y: number, w: number, h: number) => IRectangle;
export type ColorConstructor = new (r: number, g: number, b: number, a: number) => IColor;
