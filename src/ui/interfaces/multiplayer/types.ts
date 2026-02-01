/**
 * Multiplayer UI Types
 */

/**
 * Room display info for UI
 */
export interface RoomDisplayInfo {
  roomId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  mapSize: string;
  isPrivate: boolean;
  host: string;
}

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

/**
 * Player colors for display
 */
export const PLAYER_COLORS = ['#4a9eff', '#ff6b6b', '#6bff6b', '#ffdd6b'] as const;
