/**
 * Reconnection Manager
 * Handles automatic reconnection logic for the client
 */
import { getNetworkClient, ConnectionState, NetworkEvent } from './networkClient';
import { NETWORK_CONFIG } from './config';

/**
 * Reconnection state
 */
export interface ReconnectionState {
  isReconnecting: boolean;
  attempt: number;
  maxAttempts: number;
  nextRetryMs: number;
  lastDisconnectTime: number;
}

/**
 * Reconnection status callback
 */
type ReconnectionCallback = (state: ReconnectionState) => void;

/**
 * Manages reconnection logic
 */
export class ReconnectionManager {
  private state: ReconnectionState = {
    isReconnecting: false,
    attempt: 0,
    maxAttempts: NETWORK_CONFIG.maxReconnectAttempts,
    nextRetryMs: 0,
    lastDisconnectTime: 0,
  };

  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private statusCallbacks: ReconnectionCallback[] = [];
  private reconnectionToken: string | null = null;

  constructor() {
    this.setupListeners();
  }

  /**
   * Register for reconnection status updates
   */
  onStatusChange(callback: ReconnectionCallback): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index !== -1) this.statusCallbacks.splice(index, 1);
    };
  }

  /**
   * Save reconnection token for game room reconnection
   */
  saveSession(reconnectionToken: string): void {
    this.reconnectionToken = reconnectionToken;

    // Persist to sessionStorage for page refresh recovery
    try {
      sessionStorage.setItem(
        'cannonwar_session',
        JSON.stringify({ reconnectionToken, timestamp: Date.now() })
      );
    } catch {
      // sessionStorage may not be available
    }
  }

  /**
   * Clear saved session
   */
  clearSession(): void {
    this.reconnectionToken = null;

    try {
      sessionStorage.removeItem('cannonwar_session');
    } catch {
      // sessionStorage may not be available
    }
  }

  /**
   * Check if there's a saved session to reconnect to
   */
  hasSavedSession(): boolean {
    if (this.reconnectionToken) return true;

    try {
      const saved = sessionStorage.getItem('cannonwar_session');
      if (saved) {
        const data = JSON.parse(saved);
        // Only valid if less than 3 minutes old
        if (Date.now() - data.timestamp < 180000 && data.reconnectionToken) {
          this.reconnectionToken = data.reconnectionToken;
          return true;
        }
        sessionStorage.removeItem('cannonwar_session');
      }
    } catch {
      // ignore
    }

    return false;
  }

  /**
   * Cancel any ongoing reconnection
   */
  cancel(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.state.isReconnecting = false;
    this.state.attempt = 0;
    this.notifyStatus();
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.cancel();
    this.statusCallbacks = [];
    this.clearSession();
  }

  // ==================== Private ====================

  /**
   * Setup network event listeners
   */
  private setupListeners(): void {
    const client = getNetworkClient();

    client.events.on(NetworkEvent.STATE_CHANGED, (...args: unknown[]) => {
      const data = args[0] as { oldState: ConnectionState; newState: ConnectionState };

      if (data.newState === ConnectionState.RECONNECTING) {
        this.startReconnection();
      } else if (
        data.newState === ConnectionState.IN_GAME ||
        data.newState === ConnectionState.CONNECTED_LOBBY
      ) {
        if (this.state.isReconnecting) {
          this.onReconnected();
        }
      }
    });

    client.events.on(NetworkEvent.GAME_ENDED, () => {
      this.clearSession();
    });
  }

  /**
   * Start reconnection process
   */
  private startReconnection(): void {
    this.state.isReconnecting = true;
    this.state.attempt = 0;
    this.state.lastDisconnectTime = Date.now();

    this.attemptReconnect();
  }

  /**
   * Attempt a single reconnection
   */
  private attemptReconnect(): void {
    this.state.attempt++;

    if (this.state.attempt > this.state.maxAttempts) {
      this.onReconnectionFailed();
      return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = NETWORK_CONFIG.reconnectInterval * Math.pow(2, this.state.attempt - 1);
    this.state.nextRetryMs = delay;

    this.notifyStatus();

    console.log(
      `[ReconnectionManager] Attempt ${this.state.attempt}/${this.state.maxAttempts} in ${delay}ms`
    );

    this.retryTimer = setTimeout(async () => {
      const client = getNetworkClient();

      if (this.reconnectionToken) {
        // Game room reconnection using Colyseus reconnectionToken
        const success = await client.reconnectToGame(this.reconnectionToken);
        if (!success) {
          this.attemptReconnect();
        }
      } else {
        // Lobby-only reconnection (no game session to restore)
        try {
          await client.connectToLobby(client.playerName);
        } catch {
          this.attemptReconnect();
        }
      }
    }, delay);
  }

  /**
   * Reconnection succeeded
   */
  private onReconnected(): void {
    console.log('[ReconnectionManager] Reconnected successfully');

    this.state.isReconnecting = false;
    this.state.attempt = 0;
    this.notifyStatus();
  }

  /**
   * Reconnection failed after all attempts
   */
  private onReconnectionFailed(): void {
    console.log('[ReconnectionManager] Reconnection failed after all attempts');

    this.state.isReconnecting = false;
    this.clearSession();
    this.notifyStatus();
  }

  /**
   * Notify all status callbacks
   */
  private notifyStatus(): void {
    for (const callback of this.statusCallbacks) {
      try {
        callback({ ...this.state });
      } catch (error) {
        console.error('[ReconnectionManager] Status callback error:', error);
      }
    }
  }
}

/**
 * Singleton reconnection manager
 */
let reconnectionManagerInstance: ReconnectionManager | null = null;

export function getReconnectionManager(): ReconnectionManager {
  if (!reconnectionManagerInstance) {
    reconnectionManagerInstance = new ReconnectionManager();
  }
  return reconnectionManagerInstance;
}
