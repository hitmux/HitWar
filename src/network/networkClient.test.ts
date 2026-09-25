import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientMessage, LobbyMessage, ServerMessage } from './messages';
import { ConnectionState, NetworkClient, NetworkEvent } from './networkClient';

type MessageHandler = (data: unknown) => unknown;
type StateHandler = (state: unknown) => unknown;
type LeaveHandler = (code: number) => unknown;
type ErrorHandler = (code: number, message?: string) => unknown;

interface FakeRoom {
    sessionId: string;
    state: unknown;
    reconnectionToken: string;
    send: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    onStateChange: ReturnType<typeof vi.fn>;
    onLeave: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    emitMessage: (type: string, data?: unknown) => Promise<void>;
    emitStateChange: (state: unknown) => Promise<void>;
    emitLeave: (code: number) => Promise<void>;
    emitError: (code: number, message?: string) => Promise<void>;
}

interface FakeClient {
    serverUrl: string;
    joinOrCreate: ReturnType<typeof vi.fn>;
    consumeSeatReservation: ReturnType<typeof vi.fn>;
    reconnect: ReturnType<typeof vi.fn>;
}

const colyseusMock = vi.hoisted(() => {
    type MessageHandler = (data: unknown) => unknown;
    type StateHandler = (state: unknown) => unknown;
    type LeaveHandler = (code: number) => unknown;
    type ErrorHandler = (code: number, message?: string) => unknown;

    const clients: unknown[] = [];
    const rooms: unknown[] = [];

    function createRoom(options: Partial<{ sessionId: string; state: unknown; reconnectionToken: string }> = {}) {
        const messageHandlers = new Map<string, MessageHandler[]>();
        const stateHandlers: StateHandler[] = [];
        const leaveHandlers: LeaveHandler[] = [];
        const errorHandlers: ErrorHandler[] = [];

        const room = {
            sessionId: options.sessionId ?? `session-${rooms.length + 1}`,
            state: options.state ?? ({} as unknown),
            reconnectionToken: options.reconnectionToken ?? `token-${rooms.length + 1}`,
            send: vi.fn(),
            leave: vi.fn(async () => undefined),
            onMessage: vi.fn((type: string, handler: MessageHandler) => {
                const handlers = messageHandlers.get(type) ?? [];
                handlers.push(handler);
                messageHandlers.set(type, handlers);
            }),
            onStateChange: vi.fn((handler: StateHandler) => {
                stateHandlers.push(handler);
            }),
            onLeave: vi.fn((handler: LeaveHandler) => {
                leaveHandlers.push(handler);
            }),
            onError: vi.fn((handler: ErrorHandler) => {
                errorHandlers.push(handler);
            }),
            async emitMessage(type: string, data?: unknown) {
                for (const handler of [...(messageHandlers.get(type) ?? [])]) {
                    await handler(data);
                }
            },
            async emitStateChange(state: unknown) {
                room.state = state;
                for (const handler of [...stateHandlers]) {
                    await handler(state);
                }
            },
            async emitLeave(code: number) {
                for (const handler of [...leaveHandlers]) {
                    await handler(code);
                }
            },
            async emitError(code: number, message?: string) {
                for (const handler of [...errorHandlers]) {
                    await handler(code, message);
                }
            },
        };

        rooms.push(room);
        return room;
    }

    function createClient(serverUrl: string) {
        const client = {
            serverUrl,
            joinOrCreate: vi.fn(),
            consumeSeatReservation: vi.fn(),
            reconnect: vi.fn(),
        };

        clients.push(client);
        return client;
    }

    return {
        clients,
        rooms,
        createRoom,
        createClient,
        reset() {
            clients.length = 0;
            rooms.length = 0;
        },
    };
});

const reconnectionMock = vi.hoisted(() => ({
    manager: {
        saveSession: vi.fn(),
        clearSession: vi.fn(),
    },
    reset() {
        this.manager.saveSession.mockReset();
        this.manager.clearSession.mockReset();
    },
}));

vi.mock('colyseus.js', () => ({
    Client: vi.fn((serverUrl: string) => colyseusMock.createClient(serverUrl)),
}));

vi.mock('./reconnectionManager', () => ({
    getReconnectionManager: () => reconnectionMock.manager,
}));

function lastClient(): FakeClient {
    const client = colyseusMock.clients[colyseusMock.clients.length - 1];
    if (!client) throw new Error('No fake Colyseus client was created');
    return client as FakeClient;
}

function createRoom(options?: Partial<{ sessionId: string; state: unknown; reconnectionToken: string }>): FakeRoom {
    return colyseusMock.createRoom(options) as FakeRoom;
}

async function connectToLobby(playerName = 'Alice') {
    const client = new NetworkClient();
    const lobbyRoom = createRoom({ sessionId: 'lobby-session', reconnectionToken: 'lobby-token' });
    const colyseusClient = lastClient();
    colyseusClient.joinOrCreate.mockResolvedValue(lobbyRoom);

    await client.connectToLobby(playerName);

    return { client, colyseusClient, lobbyRoom };
}

async function connectToGame() {
    const setup = await connectToLobby();
    const gameRoom = createRoom({ sessionId: 'game-session', state: { tick: 1 }, reconnectionToken: 'game-token' });
    const reservation = { room: { roomId: 'game-room' }, sessionId: 'reserved-session' };
    setup.colyseusClient.consumeSeatReservation.mockResolvedValue(gameRoom);

    await setup.lobbyRoom.emitMessage(LobbyMessage.ROOM_CREATED, {
        roomId: 'game-room',
        reservation,
    });

    return { ...setup, gameRoom, reservation };
}

describe('NetworkClient', () => {
    beforeEach(() => {
        colyseusMock.reset();
        reconnectionMock.reset();
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('connects to the lobby, stores identity, registers handlers, and emits connection events', async () => {
        const client = new NetworkClient();
        const lobbyRoom = createRoom({ sessionId: 'player-1' });
        const colyseusClient = lastClient();
        const connected = vi.fn();
        const stateChanged = vi.fn();

        colyseusClient.joinOrCreate.mockResolvedValue(lobbyRoom);
        client.events.on(NetworkEvent.CONNECTED, connected);
        client.events.on(NetworkEvent.STATE_CHANGED, stateChanged);

        await client.connectToLobby('Alice');

        expect(colyseusClient.joinOrCreate).toHaveBeenCalledWith('lobby', { playerName: 'Alice' });
        expect(client.playerName).toBe('Alice');
        expect(client.playerId).toBe('player-1');
        expect(client.lobbySessionId).toBe('player-1');
        expect(client.gameSessionId).toBe('');
        expect(client.connectionState).toBe(ConnectionState.CONNECTED_LOBBY);
        expect(client.isConnected).toBe(true);
        expect(lobbyRoom.onMessage).toHaveBeenCalledWith(LobbyMessage.ROOM_CREATED, expect.any(Function));
        expect(lobbyRoom.onMessage).toHaveBeenCalledWith(LobbyMessage.MATCH_FOUND, expect.any(Function));
        expect(lobbyRoom.onMessage).toHaveBeenCalledWith(LobbyMessage.ROOM_LIST_UPDATED, expect.any(Function));
        expect(lobbyRoom.onLeave).toHaveBeenCalledWith(expect.any(Function));
        expect(lobbyRoom.onError).toHaveBeenCalledWith(expect.any(Function));
        expect(stateChanged).toHaveBeenNthCalledWith(1, {
            oldState: ConnectionState.DISCONNECTED,
            newState: ConnectionState.CONNECTING,
        });
        expect(stateChanged).toHaveBeenNthCalledWith(2, {
            oldState: ConnectionState.CONNECTING,
            newState: ConnectionState.CONNECTED_LOBBY,
        });
        expect(connected).toHaveBeenCalledOnce();
    });

    it('joins a game room from ROOM_CREATED and stores the reconnection token', async () => {
        const { client, colyseusClient, lobbyRoom } = await connectToLobby();
        const gameRoom = createRoom({ reconnectionToken: 'game-token' });
        const stateChanged = vi.fn();
        const reservation = { room: { roomId: 'game-room' } };

        colyseusClient.consumeSeatReservation.mockResolvedValue(gameRoom);
        client.events.on(NetworkEvent.STATE_CHANGED, stateChanged);

        await lobbyRoom.emitMessage(LobbyMessage.ROOM_CREATED, {
            roomId: 'game-room',
            reservation,
        });

        expect(colyseusClient.consumeSeatReservation).toHaveBeenCalledWith(reservation);
        expect(gameRoom.onStateChange).toHaveBeenCalledWith(expect.any(Function));
        expect(gameRoom.onMessage).toHaveBeenCalledWith(ServerMessage.GAME_STARTED, expect.any(Function));
        expect(gameRoom.onMessage).toHaveBeenCalledWith(ServerMessage.TERRITORY_SYNC, expect.any(Function));
        expect(gameRoom.onMessage).toHaveBeenCalledWith(ServerMessage.BULLET_HIT, expect.any(Function));
        expect(gameRoom.onMessage).toHaveBeenCalledWith(ServerMessage.MINE_DESTROYED, expect.any(Function));
        expect(gameRoom.onMessage).toHaveBeenCalledWith(ServerMessage.ACTION_REJECTED, expect.any(Function));
        expect(gameRoom.onLeave).toHaveBeenCalledWith(expect.any(Function));
        expect(client.connectionState).toBe(ConnectionState.IN_GAME);
        expect(client.isInGame).toBe(true);
        expect(client.lobbySessionId).toBe('lobby-session');
        expect(client.gameSessionId).toBe(gameRoom.sessionId);
        expect(client.playerId).toBe(gameRoom.sessionId);
        expect(client.gameState).toEqual({});
        expect(reconnectionMock.manager.saveSession).toHaveBeenCalledWith('game-token');
        expect(stateChanged).toHaveBeenNthCalledWith(1, {
            oldState: ConnectionState.CONNECTED_LOBBY,
            newState: ConnectionState.JOINING_GAME,
        });
        expect(stateChanged).toHaveBeenNthCalledWith(2, {
            oldState: ConnectionState.JOINING_GAME,
            newState: ConnectionState.IN_GAME,
        });
    });

    it('emits MATCH_FOUND before consuming a seat reservation', async () => {
        const { client, colyseusClient, lobbyRoom } = await connectToLobby();
        const gameRoom = createRoom({ reconnectionToken: 'match-token' });
        const matchFound = vi.fn();
        const payload = {
            roomId: 'matched-room',
            reservation: { seat: 'reserved' },
        };

        colyseusClient.consumeSeatReservation.mockResolvedValue(gameRoom);
        client.events.on(NetworkEvent.MATCH_FOUND, matchFound);

        await lobbyRoom.emitMessage(LobbyMessage.MATCH_FOUND, payload);

        expect(matchFound).toHaveBeenCalledWith(payload);
        expect(colyseusClient.consumeSeatReservation).toHaveBeenCalledWith(payload.reservation);
        expect(client.connectionState).toBe(ConnectionState.IN_GAME);
        expect(reconnectionMock.manager.saveSession).toHaveBeenCalledWith('match-token');
    });

    it('sends game action messages with the expected payloads', async () => {
        const { client, gameRoom } = await connectToGame();

        client.setReady(true);
        client.setReady(false);
        client.buildTower({ towerType: 'basic', x: 10, y: 20, requestId: 'req-build-tower' });
        client.buildBuilding({ buildingType: 'wall', x: 11, y: 21, requestId: 'req-build-building' });
        client.upgradeTower({ towerId: 'tower-1', targetType: 'laser' });
        client.sellTower({ towerId: 'tower-2', requestId: 'req-sell-tower' });
        client.spawnMonster({ spawnerId: 'spawner-1', monsterType: 'runner', targetPlayerId: 'enemy-1' });
        client.cannonFire({ towerId: 'cannon-1', targetX: 30, targetY: 40 });
        client.cannonSetAutoTarget({ towerId: 'cannon-1', targetX: 50, targetY: 60, radius: 70 });
        client.cannonClearAutoTarget('cannon-1');
        client.surrender();
        client.upgradeMine({ mineId: 'mine-1' });
        client.repairMine({ mineId: 'mine-2' });
        client.downgradeMine({ mineId: 'mine-3' });
        client.sellMine({ mineId: 'mine-4' });
        client.sendUpgradeVision({ towerId: 'tower-vision', visionType: 'radar' });

        expect(gameRoom.send).toHaveBeenNthCalledWith(1, ClientMessage.PLAYER_READY);
        expect(gameRoom.send).toHaveBeenNthCalledWith(2, ClientMessage.PLAYER_NOT_READY);
        expect(gameRoom.send).toHaveBeenNthCalledWith(3, ClientMessage.BUILD_TOWER, {
            towerType: 'basic',
            x: 10,
            y: 20,
            requestId: 'req-build-tower',
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(4, ClientMessage.BUILD_BUILDING, {
            buildingType: 'wall',
            x: 11,
            y: 21,
            requestId: 'req-build-building',
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(5, ClientMessage.UPGRADE_TOWER, {
            towerId: 'tower-1',
            targetType: 'laser',
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(6, ClientMessage.SELL_TOWER, {
            towerId: 'tower-2',
            requestId: 'req-sell-tower',
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(7, ClientMessage.SPAWN_MONSTER, {
            spawnerId: 'spawner-1',
            monsterType: 'runner',
            targetPlayerId: 'enemy-1',
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(8, ClientMessage.CANNON_FIRE, {
            towerId: 'cannon-1',
            targetX: 30,
            targetY: 40,
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(9, ClientMessage.CANNON_SET_AUTO_TARGET, {
            towerId: 'cannon-1',
            targetX: 50,
            targetY: 60,
            radius: 70,
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(10, ClientMessage.CANNON_SET_AUTO_TARGET, {
            towerId: 'cannon-1',
            targetX: 0,
            targetY: 0,
            radius: 0,
            clear: true,
        });
        expect(gameRoom.send).toHaveBeenNthCalledWith(11, ClientMessage.SURRENDER);
        expect(gameRoom.send).toHaveBeenNthCalledWith(12, ClientMessage.UPGRADE_MINE, { mineId: 'mine-1' });
        expect(gameRoom.send).toHaveBeenNthCalledWith(13, ClientMessage.REPAIR_MINE, { mineId: 'mine-2' });
        expect(gameRoom.send).toHaveBeenNthCalledWith(14, ClientMessage.DOWNGRADE_MINE, { mineId: 'mine-3' });
        expect(gameRoom.send).toHaveBeenNthCalledWith(15, ClientMessage.SELL_MINE, { mineId: 'mine-4' });
        expect(gameRoom.send).toHaveBeenNthCalledWith(16, ClientMessage.UPGRADE_VISION, {
            towerId: 'tower-vision',
            visionType: 'radar',
        });
    });

    it('forwards game room server messages and state changes to network events', async () => {
        const { client, gameRoom } = await connectToGame();
        const gameStateChanged = vi.fn();
        const gameStarted = vi.fn();
        const bulletFired = vi.fn();
        const bulletHit = vi.fn();
        const mineDestroyed = vi.fn();
        const territorySync = vi.fn();
        const actionRejected = vi.fn();
        const playerReconnected = vi.fn();
        const nextState = { tick: 2 };
        const bulletPayload = {
            bulletId: 'bullet-1',
            bulletType: 'basic',
            sourceId: 'tower-1',
            sourceType: 'tower',
            ownerId: 'player-1',
            x: 1,
            y: 2,
            vx: 3,
            vy: 4,
            radius: 5,
            maxRange: 100,
        };
        const rejectedPayload = {
            action: ClientMessage.BUILD_TOWER,
            reason: 'not enough energy',
            errorCode: 'INSUFFICIENT_ENERGY',
            requestId: 'req-1',
        };
        const playerPayload = { playerId: 'player-2' };
        const bulletHitPayload = { removedBullets: ['bullet-1', 'bullet-2'] };
        const mineDestroyedPayload = { mineId: 'mine-1', destroyedBy: 'monster-1' };
        const territoryPayload = {
            territories: {
                'player-1': {
                    validBuildings: ['base-1'],
                    invalidBuildings: ['tower-1'],
                },
            },
        };

        client.events.on(NetworkEvent.GAME_STATE_CHANGED, gameStateChanged);
        client.events.on(NetworkEvent.GAME_STARTED, gameStarted);
        client.events.on(NetworkEvent.BULLET_FIRED, bulletFired);
        client.events.on(NetworkEvent.BULLET_HIT, bulletHit);
        client.events.on(NetworkEvent.MINE_DESTROYED, mineDestroyed);
        client.events.on(NetworkEvent.TERRITORY_SYNC, territorySync);
        client.events.on(NetworkEvent.ACTION_REJECTED, actionRejected);
        client.events.on(NetworkEvent.PLAYER_RECONNECTED, playerReconnected);

        await gameRoom.emitStateChange(nextState);
        await gameRoom.emitMessage(ServerMessage.GAME_STARTED, { startedAt: 1 });
        await gameRoom.emitMessage(ServerMessage.BULLET_FIRED, bulletPayload);
        await gameRoom.emitMessage(ServerMessage.BULLET_HIT, bulletHitPayload);
        await gameRoom.emitMessage(ServerMessage.MINE_DESTROYED, mineDestroyedPayload);
        await gameRoom.emitMessage(ServerMessage.TERRITORY_SYNC, territoryPayload);
        await gameRoom.emitMessage(ServerMessage.ACTION_REJECTED, rejectedPayload);
        await gameRoom.emitMessage(ServerMessage.PLAYER_RECONNECTED, playerPayload);

        expect(gameStateChanged).toHaveBeenCalledWith(nextState);
        expect(gameStarted).toHaveBeenCalledWith({ startedAt: 1 });
        expect(bulletFired).toHaveBeenCalledWith(bulletPayload);
        expect(bulletHit).toHaveBeenCalledWith(bulletHitPayload);
        expect(mineDestroyed).toHaveBeenCalledWith(mineDestroyedPayload);
        expect(territorySync).toHaveBeenCalledWith(territoryPayload);
        expect(actionRejected).toHaveBeenCalledWith(rejectedPayload);
        expect(playerReconnected).toHaveBeenCalledWith(playerPayload);
    });

    it('leaves the current game, clears the saved session, and returns to the lobby state', async () => {
        const { client, gameRoom } = await connectToGame();
        const stateChanged = vi.fn();
        client.events.on(NetworkEvent.STATE_CHANGED, stateChanged);

        await client.leaveGame();

        expect(reconnectionMock.manager.clearSession).toHaveBeenCalledOnce();
        expect(gameRoom.leave).toHaveBeenCalledWith(true);
        expect(client.connectionState).toBe(ConnectionState.CONNECTED_LOBBY);
        expect(client.isInGame).toBe(false);
        expect(client.gameSessionId).toBe('');
        expect(client.playerId).toBe(client.lobbySessionId);
        expect(stateChanged).toHaveBeenCalledWith({
            oldState: ConnectionState.IN_GAME,
            newState: ConnectionState.CONNECTED_LOBBY,
        });
    });

    it('disconnects from game and lobby rooms, emits DISCONNECTED, and removes listeners', async () => {
        const { client, gameRoom, lobbyRoom } = await connectToGame();
        const disconnected = vi.fn();
        const stateListener = vi.fn();
        client.events.on(NetworkEvent.DISCONNECTED, disconnected);
        client.events.on(NetworkEvent.STATE_CHANGED, stateListener);

        await client.disconnect();
        stateListener.mockClear();
        client.events.emit(NetworkEvent.STATE_CHANGED, { oldState: 'x', newState: 'y' });

        expect(gameRoom.leave).toHaveBeenCalledWith(true);
        expect(lobbyRoom.leave).toHaveBeenCalledWith(true);
        expect(client.connectionState).toBe(ConnectionState.DISCONNECTED);
        expect(disconnected).toHaveBeenCalledOnce();
        expect(stateListener).not.toHaveBeenCalled();
    });

    it('reconnects directly to a game room and saves the refreshed token', async () => {
        const client = new NetworkClient();
        const colyseusClient = lastClient();
        const gameRoom = createRoom({ state: { tick: 9 }, reconnectionToken: 'refreshed-token' });
        const stateChanged = vi.fn();
        colyseusClient.reconnect.mockResolvedValue(gameRoom);
        client.events.on(NetworkEvent.STATE_CHANGED, stateChanged);

        const success = await client.reconnectToGame('room-id:old-token');

        expect(success).toBe(true);
        expect(colyseusClient.reconnect).toHaveBeenCalledWith('room-id:old-token');
        expect(gameRoom.onStateChange).toHaveBeenCalledWith(expect.any(Function));
        expect(client.connectionState).toBe(ConnectionState.IN_GAME);
        expect(client.gameSessionId).toBe(gameRoom.sessionId);
        expect(client.playerId).toBe(gameRoom.sessionId);
        expect(client.gameState).toEqual({ tick: 9 });
        expect(reconnectionMock.manager.saveSession).toHaveBeenCalledWith('refreshed-token');
        expect(stateChanged).toHaveBeenCalledWith({
            oldState: ConnectionState.DISCONNECTED,
            newState: ConnectionState.IN_GAME,
        });
    });

    it('returns false when reconnecting to a game room fails', async () => {
        const client = new NetworkClient();
        const colyseusClient = lastClient();
        const error = new Error('expired token');
        colyseusClient.reconnect.mockRejectedValue(error);

        const success = await client.reconnectToGame('room-id:expired-token');

        expect(success).toBe(false);
        expect(client.connectionState).toBe(ConnectionState.DISCONNECTED);
        expect(reconnectionMock.manager.saveSession).not.toHaveBeenCalled();
    });
});
