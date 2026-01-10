/**
 * UI related types
 */

import type { VoidCallback } from './common';
import type { IVector } from './geometry';

// Router navigation types
export type RouteName =
  | 'main'
  | 'endless'
  | 'wiki'
  | 'help'
  | 'cannon'
  | 'choice'
  | 'monsters';

export interface IRoute {
  name: RouteName;
  path: string;
  component: IInterface;
}

// Interface base type
export interface IInterface {
  name: string;
  element: HTMLElement | null;

  init(): void;
  show(): void;
  hide(): void;
  destroy(): void;
}

// Panel drag state
export interface IPanelDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

// Button configuration
export interface IButtonConfig {
  text: string;
  onClick: VoidCallback;
  className?: string;
  disabled?: boolean;
}

// Menu item configuration
export interface IMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: VoidCallback;
  submenu?: IMenuItem[];
}

// Modal dialog configuration
export interface IModalConfig {
  title: string;
  content: string | HTMLElement;
  buttons?: IButtonConfig[];
  closable?: boolean;
  onClose?: VoidCallback;
}

// Toast notification types
export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface IToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
}

// Wiki entry types
export interface IWikiEntry {
  id: string;
  name: string;
  category: 'tower' | 'monster' | 'bullet' | 'building';
  description: string;
  stats?: Record<string, number | string>;
  imageIndex?: number;
}

// Selection state for game UI
export interface ISelectionState {
  selectedTower: string | null;
  selectedBuilding: string | null;
  hoveredEntity: unknown | null;
  placementMode: boolean;
}

// HUD (Heads-Up Display) state
export interface IHUDState {
  score: number;
  wave: number;
  energy: number;
  gold: number;
  fps: number;
}

// Image loader types
export interface IImageAsset {
  src: string;
  loaded: boolean;
  image: HTMLImageElement | null;
}

export interface IImageLoader {
  images: Map<string, IImageAsset>;
  load(name: string, src: string): Promise<HTMLImageElement>;
  get(name: string): HTMLImageElement | null;
  isLoaded(name: string): boolean;
  loadAll(): Promise<void>;
}

// App state types
export interface IAppState {
  currentRoute: RouteName;
  isLoading: boolean;
  error: string | null;
}

// Note system types
export interface INote {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  position?: IVector;
}

export interface INoteManager {
  notes: INote[];
  add(note: Omit<INote, 'id' | 'timestamp'>): INote;
  remove(id: string): void;
  update(id: string, updates: Partial<INote>): void;
  getAll(): INote[];
}
