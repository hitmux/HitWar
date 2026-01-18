/**
 * Entity types for Tower, Monster, Bullet, Building
 */

import type { RenderContext, GameType, IRegistry } from './common';
import type { IVector, ICircle, IColor, IReadonlyColor, IRectangle } from './geometry';

// Forward declaration for World (defined in game.ts)
export interface IWorld {
  // Minimal interface - full definition in game.ts
  addTower(tower: ITower): void;
  addMonster(monster: IMonster): void;
  addBully(bully: IBullet): void;
  addBuilding(building: IBuilding): void;
}

// Base game object interface
export interface IGameObject {
  pos: IVector;
  world: IWorld;
  gameType: GameType;
  liveTime: number;

  // Lifecycle methods
  goStep(): void;
  render(ctx: RenderContext): void;
  remove(): void;
}

// Circle-based game object interface
export interface ICircleObject extends IGameObject {
  r: number;
  speed: IVector;
  acceleration: IVector;
  accelerationV: number;
  maxSpeedN: number;

  hp: number;
  maxHp: number;
  hpColor: IColor;
  bodyColor: IColor;
  bodyStrokeWidth: number;
  bodyStrokeColor: IReadonlyColor;
  hpBarHeight: number;

  comment: string;
  selected: boolean;

  // Territory related
  inValidTerritory: boolean;
  _originalMaxHp: number | null;
  _territoryPenaltyApplied: boolean;
  _originalRangeR: number | null;

  // Methods
  getBodyCircle(): ICircle;
  bodyRadiusChange(delta: number): void;
  hpInit(maxHp: number): void;
  hpSet(hp: number): void;
  hpChange(delta: number): void;
  isDead(): boolean;
  isInScreen(): boolean;
  isOutScreen(): boolean;
  move(): void;
}

// Line-based game object interface
export interface ILineObject extends IGameObject {
  // Line objects have different properties
  startPos: IVector;
  endPos: IVector;
}

// Tower interface
export interface ITower extends ICircleObject {
  gameType: 'Tower';
  rangeR: number;
  damage: number;
  fireInterval: number;
  level: number;
  maxLevel: number;
  bulletType: string;

  // Methods
  fire(): void;
  normalAttack(): void;
  shrapnelAttack(): void;
  getViewCircle(): ICircle;
  getEffectiveRangeR(): number;
  getDamageMultiplier(): number;
  getTowerLevel(): number;
  isUpLevelAble(): boolean;
  getRunningBully(): IBullet[];
  removeOutRangeBullet(): void;
  getImgStartPosByIndex(index: number): IVector;
}

// Monster interface
export interface IMonster extends ICircleObject {
  gameType: 'Monster';
  reward: number;
  attackDamage: number;
  moveType: string;

  // Methods
  dataInit(): void;
  randInit(): void;
  bullyChange(delta: number): void;
  clash(): void;
  bombSelf(): void;
  deadSummon(): void;
  summon(): void;
  summonFunc(): void;
  gainOther(): void;
  gravyPower(): void;
  laserDefend(): void;
  teleporting(): void;
  getRenderCircle(): ICircle;
  getImgStartPosByIndex(index: number): IVector;

  // Movement methods
  selfSwingMove(): void;
  selfDoubleSwingMove(): void;
  selfExcitingMove(): void;
  selfSuddenlyMove(): void;
}

// Bullet interface (Bully class)
export interface IBullet extends ICircleObject {
  gameType: 'Bully';
  damage: number;
  target: IMonster | null;
  tower: ITower;
  penetrating: boolean;
  explosive: boolean;
  explosiveRadius: number;

  // Methods
  collide(): void;
  boom(): void;
  bombFire(): void;
  bombFreeze(): void;
  split(): void;
  haveTarget(): boolean;
  getTarget(): IMonster | null;
  outTowerViewRange(): boolean;
  getViewCircle(): ICircle;
  damageChange(delta: number): void;
  rChange(delta: number): void;
}

// Building interface
export interface IBuilding extends ICircleObject {
  gameType: 'Building';
  buildingType: string;

  // Methods inherited from CircleObject
}

// Registry types
export type TowerRegistry = IRegistry<ITower>;
export type MonsterRegistry = IRegistry<IMonster>;
export type BulletRegistry = IRegistry<IBullet>;
export type BuildingRegistry = IRegistry<IBuilding>;

// Entity constructor options
export interface ITowerOptions {
  pos: IVector;
  world: IWorld;
  level?: number;
}

export interface IMonsterOptions {
  pos: IVector;
  world: IWorld;
  hp?: number;
  speed?: number;
}

export interface IBulletOptions {
  pos: IVector;
  world: IWorld;
  tower: ITower;
  target?: IMonster;
  damage?: number;
}

export interface IBuildingOptions {
  pos: IVector;
  world: IWorld;
}
