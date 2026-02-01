/**
 * Server configuration constants
 */
export const SERVER_CONFIG = {
  // Server settings
  port: parseInt(process.env.PORT || '2567', 10),
  host: process.env.HOST || '0.0.0.0',

  // Room settings
  maxRoomsPerType: 100,

  // Game room settings
  maxPlayersPerRoom: 2,
  roomReservationTime: 15000, // 15 seconds to join after reservation

  // Reconnect settings
  reconnectTimeout: 60000, // 60 seconds to reconnect
  maxPauseTime: 180000, // 3 minutes max pause time

  // Tick rate
  tickRate: 60, // 60 ticks per second (matching client)
  patchRate: 20, // Send state updates 20 times per second

  // Development
  isDev: process.env.NODE_ENV !== 'production',
};

/**
 * PvP game configuration (mirroring client-side PVP_CONFIG)
 */
export const PVP_CONFIG = {
  // Players
  maxPlayers: 2,
  initialMoney: 1000,

  // Map sizes
  mapSizes: {
    small: { width: 4000, height: 3000 },
    medium: { width: 6000, height: 4000 },
    large: { width: 8000, height: 5000 },
  },

  // Base positions (ratio relative to map size)
  basePositions: [
    { xRatio: 0.2, yRatio: 0.5 }, // Player A (left)
    { xRatio: 0.8, yRatio: 0.5 }, // Player B (right)
  ],

  // Spawning system
  spawn: {
    costMultiplier: 2, // spawn cost = addPrice × 2
  },

  // Territory
  territory: {
    enemyBuildCostMultiplier: 2, // Enemy territory build cost multiplier
  },

  // Vision
  vision: {
    spawnedMonsterProvidesVision: false,
  },

  // Manual cannon
  manualCannon: {
    price: 800,
    damage: 100,
    attackRadius: 400,
    reloadTime: 60,
    maxAmmo: 3,
    explosionRadius: 50,
  },

  // Energy system
  energy: {
    perPlayerIndependent: true,
    sharedMinesInCenter: true,
  },
};

export type MapSize = keyof typeof PVP_CONFIG.mapSizes;
