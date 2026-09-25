import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyMessage } from '../shared/types/messages.js';
import { LobbyState } from '../schema/LobbyState.js';

const colyseusMocks = vi.hoisted(() => {
  const clockSetInterval = vi.fn();
  const setState = vi.fn();
  const onMessage = vi.fn(function (
    this: { __messageHandlers: Map<string, unknown> },
    messageType: string,
    handler: unknown
  ) {
    this.__messageHandlers.set(messageType, handler);
  });

  class MockRoom {
    state: unknown;
    maxClients = 0;
    autoDispose = true;
    clients: unknown[] = [];
    clock = {
      setInterval: clockSetInterval,
    };
    __messageHandlers = new Map<string, unknown>();

    setState(state: unknown): void {
      this.state = state;
      setState(state);
    }

    onMessage(messageType: string, handler: unknown): void {
      onMessage.call(this, messageType, handler);
    }
  }

  return {
    MockRoom,
    clockSetInterval,
    setState,
    onMessage,
    matchMaker: {
      createRoom: vi.fn(),
      reserveSeatFor: vi.fn(),
      remoteRoomCall: vi.fn(),
      query: vi.fn(),
    },
  };
});

vi.mock('@colyseus/core', () => ({
  Room: colyseusMocks.MockRoom,
  Client: class MockClient {},
  matchMaker: colyseusMocks.matchMaker,
}));

import { LobbyRoom } from './LobbyRoom.js';

interface MockClient {
  sessionId: string;
  send: ReturnType<typeof vi.fn>;
}

function createClient(sessionId: string): MockClient {
  return {
    sessionId,
    send: vi.fn(),
  };
}

function createLobby(): LobbyRoom {
  const room = new LobbyRoom();
  room.onCreate();
  return room;
}

function getMessageHandlers(room: LobbyRoom): Map<string, unknown> {
  return (room as unknown as { __messageHandlers: Map<string, unknown> }).__messageHandlers;
}

async function flushPromises(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('LobbyRoom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    colyseusMocks.clockSetInterval.mockClear();
    colyseusMocks.setState.mockClear();
    colyseusMocks.onMessage.mockClear();
    colyseusMocks.matchMaker.createRoom.mockReset();
    colyseusMocks.matchMaker.reserveSeatFor.mockReset();
    colyseusMocks.matchMaker.remoteRoomCall.mockReset();
    colyseusMocks.matchMaker.query.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes lobby state, room options, handlers, and disposable timers', () => {
    const room = createLobby();

    expect(room.state).toBeInstanceOf(LobbyState);
    expect(colyseusMocks.setState).toHaveBeenCalledWith(room.state);
    expect(room.maxClients).toBe(1000);
    expect(room.autoDispose).toBe(false);

    expect([...getMessageHandlers(room).keys()]).toEqual([
      LobbyMessage.CREATE_ROOM,
      LobbyMessage.JOIN_ROOM,
      LobbyMessage.QUICK_MATCH,
      LobbyMessage.CANCEL_SEARCH,
      LobbyMessage.REFRESH_ROOMS,
    ]);
    expect(colyseusMocks.clockSetInterval).toHaveBeenCalledTimes(1);
    expect(colyseusMocks.clockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(vi.getTimerCount()).toBe(1);

    room.onDispose();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('maintains lobby players, online count, and removes leaving clients from quick match queue', () => {
    const room = createLobby();
    const alice = createClient('alice-session');
    const bob = createClient('bob-session');

    room.onJoin(alice as any, { playerName: 'Alice' });
    room.onJoin(bob as any, {});

    expect(room.state.players.get('alice-session')?.name).toBe('Alice');
    expect(room.state.players.get('bob-session')?.name).toBe('Player 2');
    expect(room.state.onlineCount).toBe(2);

    (room as any).handleQuickMatch(alice);
    expect((room as any).matchQueue).toEqual([alice]);
    expect(room.state.players.get('alice-session')?.isSearching).toBe(true);

    room.onLeave(alice as any);

    expect((room as any).matchQueue).toEqual([]);
    expect(room.state.players.has('alice-session')).toBe(false);
    expect(room.state.onlineCount).toBe(1);
    expect(room.state.players.has('bob-session')).toBe(true);
  });

  it('creates a game room, reserves a seat, writes metadata, and sends ROOM_CREATED', async () => {
    const room = createLobby();
    const client = createClient('host-session');
    const createdRoom = { roomId: 'game-room-1' };
    const reservation = { sessionId: 'reservation-1' };
    colyseusMocks.matchMaker.createRoom.mockResolvedValue(createdRoom);
    colyseusMocks.matchMaker.reserveSeatFor.mockResolvedValue(reservation);
    colyseusMocks.matchMaker.remoteRoomCall.mockResolvedValue(undefined);

    room.onJoin(client as any, { playerName: 'Alice' });

    await (room as any).handleCreateRoom(client, {
      roomName: 'Alice Arena',
      mapSize: 'large',
      isPrivate: true,
    });

    expect(colyseusMocks.matchMaker.createRoom).toHaveBeenCalledWith('game', {
      mapSize: 'large',
      isPrivate: true,
    });
    expect(colyseusMocks.matchMaker.reserveSeatFor).toHaveBeenCalledWith(createdRoom, {
      playerName: 'Alice',
    });
    expect(colyseusMocks.matchMaker.remoteRoomCall).toHaveBeenCalledWith('game-room-1', 'setMetadata', [
      {
        roomName: 'Alice Arena',
        hostName: 'Alice',
        mapSize: 'large',
        isPrivate: true,
        isPlaying: false,
      },
    ]);
    expect(client.send).toHaveBeenCalledWith(LobbyMessage.ROOM_CREATED, {
      roomId: 'game-room-1',
      reservation,
    });
  });

  it('joins an available room and sends MATCH_FOUND with the reservation', async () => {
    const room = createLobby();
    const client = createClient('joiner-session');
    const targetRoom = {
      roomId: 'game-room-2',
      clients: 1,
      maxClients: 2,
    };
    const reservation = { sessionId: 'reservation-2' };
    colyseusMocks.matchMaker.query.mockResolvedValue([targetRoom]);
    colyseusMocks.matchMaker.reserveSeatFor.mockResolvedValue(reservation);

    room.onJoin(client as any, { playerName: 'Bob' });

    await (room as any).handleJoinRoom(client, { roomId: 'game-room-2' });

    expect(colyseusMocks.matchMaker.query).toHaveBeenCalledWith({ roomId: 'game-room-2' });
    expect(colyseusMocks.matchMaker.reserveSeatFor).toHaveBeenCalledWith(targetRoom, {
      playerName: 'Bob',
    });
    expect(client.send).toHaveBeenCalledWith(LobbyMessage.MATCH_FOUND, {
      roomId: 'game-room-2',
      reservation,
    });
  });

  it('sends ERROR when joining a missing room fails', async () => {
    const room = createLobby();
    const client = createClient('missing-room-client');
    colyseusMocks.matchMaker.query.mockResolvedValue([]);

    room.onJoin(client as any, { playerName: 'Carol' });

    await (room as any).handleJoinRoom(client, { roomId: 'missing-room' });

    expect(colyseusMocks.matchMaker.reserveSeatFor).not.toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledWith(LobbyMessage.ERROR, {
      code: 'JOIN_FAILED',
      message: 'Failed to join room. It may be full or no longer available.',
    });
  });

  it('quick matches two connected players into a game room and sends MATCH_FOUND to both', async () => {
    const room = createLobby();
    const alice = createClient('alice-session');
    const bob = createClient('bob-session');
    const matchedRoom = { roomId: 'matched-room' };
    const aliceReservation = { sessionId: 'alice-reservation' };
    const bobReservation = { sessionId: 'bob-reservation' };
    colyseusMocks.matchMaker.createRoom.mockResolvedValue(matchedRoom);
    colyseusMocks.matchMaker.reserveSeatFor
      .mockResolvedValueOnce(aliceReservation)
      .mockResolvedValueOnce(bobReservation);

    room.clients.push(alice as any, bob as any);
    room.onJoin(alice as any, { playerName: 'Alice' });
    room.onJoin(bob as any, { playerName: 'Bob' });

    (room as any).handleQuickMatch(alice);
    (room as any).handleQuickMatch(bob);
    (room as any).processMatchQueue();

    await flushPromises();

    expect(alice.send).toHaveBeenCalledWith(LobbyMessage.MATCH_FOUND, {
      roomId: 'matched-room',
      reservation: aliceReservation,
    });
    expect(bob.send).toHaveBeenCalledWith(LobbyMessage.MATCH_FOUND, {
      roomId: 'matched-room',
      reservation: bobReservation,
    });

    expect(colyseusMocks.matchMaker.createRoom).toHaveBeenCalledWith('game', {
      mapSize: 'medium',
    });
    expect(colyseusMocks.matchMaker.reserveSeatFor).toHaveBeenNthCalledWith(1, matchedRoom, {
      playerName: 'Alice',
    });
    expect(colyseusMocks.matchMaker.reserveSeatFor).toHaveBeenNthCalledWith(2, matchedRoom, {
      playerName: 'Bob',
    });
    expect(room.state.players.get('alice-session')?.isSearching).toBe(false);
    expect(room.state.players.get('bob-session')?.isSearching).toBe(false);
    expect((room as any).matchQueue).toEqual([]);
  });
});
