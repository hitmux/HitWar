/**
 * Type definitions index - unified exports
 *
 * This file re-exports all types from the types directory for convenient importing.
 * Usage: import { IVector, ITower, IWorld } from '@/types';
 */

// Common types
export type {
  RenderContext,
  ColorArray,
  GameType,
  VoidCallback,
  TickCallback,
  IPosition,
  ISize,
  IBounds,
  EntityCreator,
  IRegistry,
  ISaveData,
  MouseEventHandler,
  TouchEventHandler,
  KeyboardEventHandler,
} from './common';

// Geometry types
export type {
  IVector,
  ICircle,
  ILine,
  IRectangle,
  IColor,
  VectorConstructor,
  CircleConstructor,
  LineConstructor,
  RectangleConstructor,
  ColorConstructor,
} from './geometry';

// Entity types
export type {
  IGameObject,
  ICircleObject,
  ILineObject,
  ITower,
  IMonster,
  IBullet,
  IBuilding,
  TowerRegistry,
  MonsterRegistry,
  BulletRegistry,
  BuildingRegistry,
  ITowerOptions,
  IMonsterOptions,
  IBulletOptions,
  IBuildingOptions,
} from './entities';

// Game types
export type {
  IEffect,
  IQuadTree,
  ICamera,
  IWorld,
  IGame,
  IGameState,
  ITowerSaveData,
  IBuildingSaveData,
  IResourceState,
  IGameConfig,
  IInputState,
} from './game';

// UI types
export type {
  RouteName,
  IRoute,
  IInterface,
  IPanelDragState,
  IButtonConfig,
  IMenuItem,
  IModalConfig,
  ToastType,
  IToastConfig,
  IWikiEntry,
  ISelectionState,
  IHUDState,
  IImageAsset,
  IImageLoader,
  IAppState,
  INote,
  INoteManager,
} from './ui';

// System types
export type {
  ISaveManager,
  ISaveInfo,
  ISaveUI,
  SoundName,
  ISoundConfig,
  ISound,
  ISoundManager,
  IEnergySystem,
  IMine,
  IEnergyRenderer,
  ITerritory,
  ITerritoryRenderer,
  ITerritoryCell,
  SystemEventType,
  ISystemEvent,
  SystemEventHandler,
  ISystemManager,
} from './systems';
