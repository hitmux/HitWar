/**
 * System types for Save, Sound, Energy, Territory
 */

import type { VoidCallback, ISaveData } from './common';
import type { IVector, ICircle } from './geometry';
import type { IWorld, IGameState } from './game';

// Save system types
export interface ISaveManager {
  currentSlot: number;
  maxSlots: number;

  save(slot: number, data: IGameState): boolean;
  load(slot: number): IGameState | null;
  delete(slot: number): boolean;
  hasSave(slot: number): boolean;
  getSaveInfo(slot: number): ISaveInfo | null;
  getAllSaves(): ISaveInfo[];
  exportSave(slot: number): string;
  importSave(data: string): boolean;
}

export interface ISaveInfo {
  slot: number;
  timestamp: number;
  score: number;
  wave: number;
  playTime: number;
}

export interface ISaveUI {
  show(): void;
  hide(): void;
  refresh(): void;
}

// Sound system types
export type SoundName = string;

export interface ISoundConfig {
  volume: number;
  loop: boolean;
  playbackRate?: number;
}

export interface ISound {
  name: SoundName;
  audio: HTMLAudioElement;
  config: ISoundConfig;

  play(): void;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
}

export interface ISoundManager {
  sounds: Map<SoundName, ISound>;
  masterVolume: number;
  muted: boolean;

  load(name: SoundName, src: string, config?: Partial<ISoundConfig>): Promise<void>;
  play(name: SoundName): void;
  pause(name: SoundName): void;
  stop(name: SoundName): void;
  stopAll(): void;
  setMasterVolume(volume: number): void;
  setMuted(muted: boolean): void;
  isPlaying(name: SoundName): boolean;
}

// Energy system types
export interface IEnergySystem {
  current: number;
  max: number;
  regenRate: number;

  add(amount: number): void;
  consume(amount: number): boolean;
  canAfford(amount: number): boolean;
  setMax(max: number): void;
  setRegenRate(rate: number): void;
  update(deltaTime: number): void;
}

export interface IMine {
  pos: IVector;
  world: IWorld;
  energyPerTick: number;
  radius: number;
  active: boolean;

  goStep(): void;
  render(ctx: CanvasRenderingContext2D): void;
  activate(): void;
  deactivate(): void;
}

export interface IEnergyRenderer {
  render(ctx: CanvasRenderingContext2D, energy: IEnergySystem): void;
}

// Territory system types
export interface ITerritory {
  world: IWorld;
  cells: Set<string>;
  expansionCost: number;

  expand(pos: IVector): boolean;
  isInTerritory(pos: IVector): boolean;
  getCellKey(pos: IVector): string;
  getAdjacentCells(pos: IVector): IVector[];
  canExpand(pos: IVector): boolean;
  getTerritoryBounds(): { min: IVector; max: IVector };
  getCellCount(): number;
}

export interface ITerritoryRenderer {
  render(ctx: CanvasRenderingContext2D, territory: ITerritory): void;
  renderCell(ctx: CanvasRenderingContext2D, pos: IVector, isActive: boolean): void;
  renderBorder(ctx: CanvasRenderingContext2D, territory: ITerritory): void;
}

// Territory cell state
export interface ITerritoryCell {
  x: number;
  y: number;
  active: boolean;
  hasBuilding: boolean;
}

// System event types
export type SystemEventType =
  | 'energy-changed'
  | 'territory-expanded'
  | 'save-completed'
  | 'load-completed'
  | 'sound-played';

export interface ISystemEvent {
  type: SystemEventType;
  data?: unknown;
  timestamp: number;
}

export type SystemEventHandler = (event: ISystemEvent) => void;

// System manager interface (optional, for centralized system management)
export interface ISystemManager {
  saveManager: ISaveManager;
  soundManager: ISoundManager;
  energySystem: IEnergySystem;
  territory: ITerritory;

  init(): void;
  update(deltaTime: number): void;
  destroy(): void;
}

// Fog of War system types
export interface FogOfWarLike {
  enabled: boolean;
  isPositionVisible(x: number, y: number): boolean;
  markDirty(): void;
}
