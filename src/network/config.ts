/**
 * Network Client Configuration
 */
export const NETWORK_CONFIG = {
  // Server URL
  serverUrl: import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567',

  // Reconnection settings
  maxReconnectAttempts: 5,
  reconnectInterval: 2000, // 2 seconds between reconnect attempts

  // Timeouts
  connectionTimeout: 10000, // 10 seconds to connect
  roomJoinTimeout: 15000, // 15 seconds to join room
};
