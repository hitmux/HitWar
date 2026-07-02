/**
 * Player configuration metadata
 * Single source of truth for player colors in multiplayer mode
 */

/**
 * Player colors for multiplayer mode
 * Index 0 = Player 1 (left), Index 1 = Player 2 (right), etc.
 */
export const PLAYER_COLORS = [
  '#3498db', // Blue - Player 1
  '#e74c3c', // Red - Player 2
  '#2ecc71', // Green - Player 3
  '#f1c40f', // Yellow - Player 4
] as const;
