/**
 * Multiplayer UI Types
 */

/**
 * Player display info for waiting room
 */
export interface PlayerDisplayInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  color: string;
}

/**
 * Map size options
 */
export const MAP_SIZE_OPTIONS = [
  { value: 'small', label: '小 (4000×3000)', description: '快节奏' },
  { value: 'medium', label: '中 (6000×4000)', description: '推荐' },
  { value: 'large', label: '大 (8000×5000)', description: '持久战' },
] as const;

export type MapSize = (typeof MAP_SIZE_OPTIONS)[number]['value'];

// Re-export from shared config (single source of truth)
export { PLAYER_COLORS } from '@shared/config/playerMeta';
