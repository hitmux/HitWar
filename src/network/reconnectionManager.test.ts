import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconnectionManager } from './reconnectionManager';
import { ConnectionState, NetworkEvent } from './networkClient';

const networkMock = vi.hoisted(() => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const client = {
        events: {
            on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
                const callbacks = listeners.get(event) ?? [];
                callbacks.push(callback);
                listeners.set(event, callbacks);
                return () => {
                    const current = listeners.get(event) ?? [];
                    const index = current.indexOf(callback);
                    if (index !== -1) current.splice(index, 1);
                };
            }),
        },
        playerName: 'Alice',
        reconnectToGame: vi.fn(),
        connectToLobby: vi.fn(),
    };

    return {
        listeners,
        client,
        emit(event: string, ...args: unknown[]) {
            for (const callback of [...(listeners.get(event) ?? [])]) {
                callback(...args);
            }
        },
        reset() {
            listeners.clear();
            client.events.on.mockClear();
            client.reconnectToGame.mockReset();
            client.connectToLobby.mockReset();
            client.playerName = 'Alice';
        },
    };
});

vi.mock('./networkClient', () => ({
    ConnectionState: {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting',
        CONNECTED_LOBBY: 'connected_lobby',
        JOINING_GAME: 'joining_game',
        IN_GAME: 'in_game',
        RECONNECTING: 'reconnecting',
        ERROR: 'error',
    },
    NetworkEvent: {
        STATE_CHANGED: 'state_changed',
        GAME_ENDED: 'game_ended',
    },
    getNetworkClient: () => networkMock.client,
}));

function createSessionStorage() {
    const store = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store.clear();
        }),
    };
}

describe('ReconnectionManager', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T00:00:00.000Z'));
        networkMock.reset();
        Object.defineProperty(globalThis, 'sessionStorage', {
            value: createSessionStorage(),
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('registers network listeners on construction', () => {
        new ReconnectionManager();

        expect(networkMock.client.events.on).toHaveBeenCalledWith(NetworkEvent.STATE_CHANGED, expect.any(Function));
        expect(networkMock.client.events.on).toHaveBeenCalledWith(NetworkEvent.GAME_ENDED, expect.any(Function));
    });

    it('notifies status when reconnecting starts and supports unsubscribe', () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        const unsubscribe = manager.onStatusChange(status);

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.RECONNECTING,
        });

        expect(status).toHaveBeenCalledWith({
            isReconnecting: true,
            attempt: 1,
            maxAttempts: 5,
            nextRetryMs: 2000,
            lastDisconnectTime: Date.now(),
        });

        unsubscribe();
        manager.cancel();
        expect(status).toHaveBeenCalledTimes(1);
    });

    it('persists valid sessions and expires stale sessionStorage entries', () => {
        const manager = new ReconnectionManager();

        manager.saveSession('token-1');
        expect(manager.hasSavedSession()).toBe(true);
        manager.clearSession();

        sessionStorage.setItem('cannonwar_session', JSON.stringify({
            reconnectionToken: 'token-2',
            timestamp: Date.now() - 179999,
        }));
        expect(manager.hasSavedSession()).toBe(true);

        manager.clearSession();
        sessionStorage.setItem('cannonwar_session', JSON.stringify({
            reconnectionToken: 'token-3',
            timestamp: Date.now() - 180000,
        }));
        expect(manager.hasSavedSession()).toBe(false);
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('cannonwar_session');
    });

    it('ignores unavailable or invalid sessionStorage data', () => {
        const manager = new ReconnectionManager();
        Object.defineProperty(globalThis, 'sessionStorage', {
            value: {
                getItem: vi.fn(() => '{broken'),
                setItem: vi.fn(() => { throw new Error('disabled'); }),
                removeItem: vi.fn(() => { throw new Error('disabled'); }),
            },
            configurable: true,
        });

        manager.saveSession('token-1');
        manager.clearSession();

        expect(manager.hasSavedSession()).toBe(false);
    });

    it('uses a reconnection token and schedules exponential retry when reconnect fails', async () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        manager.onStatusChange(status);
        manager.saveSession('token-1');
        networkMock.client.reconnectToGame.mockResolvedValue(false);
        const disconnectedAt = Date.now();

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.RECONNECTING,
        });

        await vi.advanceTimersByTimeAsync(2000);

        expect(networkMock.client.reconnectToGame).toHaveBeenCalledWith('token-1');
        expect(status).toHaveBeenLastCalledWith({
            isReconnecting: true,
            attempt: 2,
            maxAttempts: 5,
            nextRetryMs: 4000,
            lastDisconnectTime: disconnectedAt,
        });
    });

    it('falls back to lobby reconnection when no session token exists', async () => {
        const manager = new ReconnectionManager();
        networkMock.client.connectToLobby.mockResolvedValue(undefined);

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.CONNECTED_LOBBY,
            newState: ConnectionState.RECONNECTING,
        });
        await vi.advanceTimersByTimeAsync(2000);

        expect(networkMock.client.connectToLobby).toHaveBeenCalledWith('Alice');
    });

    it('retries lobby reconnection when connectToLobby rejects', async () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        manager.onStatusChange(status);
        networkMock.client.connectToLobby.mockRejectedValue(new Error('offline'));

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.CONNECTED_LOBBY,
            newState: ConnectionState.RECONNECTING,
        });
        await vi.advanceTimersByTimeAsync(2000);

        expect(networkMock.client.connectToLobby).toHaveBeenCalledWith('Alice');
        expect(status).toHaveBeenLastCalledWith({
            isReconnecting: true,
            attempt: 2,
            maxAttempts: 5,
            nextRetryMs: 4000,
            lastDisconnectTime: new Date('2026-06-08T00:00:00.000Z').getTime(),
        });
    });

    it('clears session after exhausting reconnect attempts', async () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        manager.onStatusChange(status);
        manager.saveSession('token-1');
        networkMock.client.reconnectToGame.mockResolvedValue(false);

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.RECONNECTING,
        });

        await vi.advanceTimersByTimeAsync(2000 + 4000 + 8000 + 16000 + 32000);

        expect(log).toHaveBeenCalledWith('[ReconnectionManager] Reconnection failed after all attempts');
        expect(status).toHaveBeenLastCalledWith({
            isReconnecting: false,
            attempt: 6,
            maxAttempts: 5,
            nextRetryMs: 32000,
            lastDisconnectTime: new Date('2026-06-08T00:00:00.000Z').getTime(),
        });
        expect(manager.hasSavedSession()).toBe(false);
    });

    it('stops reconnecting when the network returns to a connected state', () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        manager.onStatusChange(status);

        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.RECONNECTING,
        });
        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.RECONNECTING,
            newState: ConnectionState.IN_GAME,
        });

        expect(status).toHaveBeenLastCalledWith({
            isReconnecting: false,
            attempt: 0,
            maxAttempts: 5,
            nextRetryMs: 2000,
            lastDisconnectTime: Date.now(),
        });
    });

    it('clears saved session when the game ends', () => {
        const manager = new ReconnectionManager();
        manager.saveSession('token-1');

        networkMock.emit(NetworkEvent.GAME_ENDED);

        expect(manager.hasSavedSession()).toBe(false);
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('cannonwar_session');
    });

    it('dispose clears callbacks and saved session', () => {
        const manager = new ReconnectionManager();
        const status = vi.fn();
        manager.onStatusChange(status);
        manager.saveSession('token-1');

        manager.dispose();
        manager.cancel();

        expect(status).toHaveBeenCalledTimes(1);
        expect(manager.hasSavedSession()).toBe(false);
    });

    it('logs and continues when a status callback throws', () => {
        const manager = new ReconnectionManager();
        const error = new Error('callback failed');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const after = vi.fn();

        manager.onStatusChange(() => { throw error; });
        manager.onStatusChange(after);
        networkMock.emit(NetworkEvent.STATE_CHANGED, {
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.RECONNECTING,
        });

        expect(consoleError).toHaveBeenCalledWith('[ReconnectionManager] Status callback error:', error);
        expect(after).toHaveBeenCalledOnce();
    });
});
