import type { Client } from '@colyseus/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PVP_CONFIG } from '../config.js';
import { GamePhase } from '../schema/index.js';
import { GameState } from '../schema/GameState.js';
import { ClientMessage, ServerMessage } from '../shared/types/messages.js';
import { GameRoom } from './GameRoom.js';

type MessageHandler = (client: Client, payload?: unknown) => void;
type FakeDelayed = { clear: ReturnType<typeof vi.fn>; callback: () => void };

interface RoomHarness {
  room: GameRoom;
  handlers: Map<string, MessageHandler>;
  broadcast: ReturnType<typeof vi.fn>;
  clockIntervals: FakeDelayed[];
  lock: ReturnType<typeof vi.fn>;
  setMetadata: ReturnType<typeof vi.fn>;
}

const REGISTERED_CLIENT_MESSAGES = [
  ClientMessage.PLAYER_READY,
  ClientMessage.PLAYER_NOT_READY,
  ClientMessage.BUILD_TOWER,
  ClientMessage.BUILD_BUILDING,
  ClientMessage.UPGRADE_TOWER,
  ClientMessage.SELL_TOWER,
  ClientMessage.SPAWN_MONSTER,
  ClientMessage.CANNON_FIRE,
  ClientMessage.CANNON_SET_AUTO_TARGET,
  ClientMessage.SURRENDER,
  ClientMessage.UPGRADE_MINE,
  ClientMessage.REPAIR_MINE,
  ClientMessage.DOWNGRADE_MINE,
  ClientMessage.SELL_MINE,
  ClientMessage.UPGRADE_VISION,
] as const;

function createRoomHarness(): RoomHarness {
  const room = new GameRoom();
  room.setPatchRate(null);
  const handlers = new Map<string, MessageHandler>();
  const broadcast = vi.fn();
  const clockIntervals: FakeDelayed[] = [];
  const lock = vi.fn(async () => undefined);
  const setMetadata = vi.fn(async () => undefined);

  Object.defineProperty(room, 'roomId', {
    value: 'game-room-test',
    configurable: true,
  });

  (room as unknown as { setState: (state: GameState) => void }).setState = (state) => {
    (room as unknown as { state: GameState }).state = state;
  };
  (room as unknown as { onMessage: (type: string, handler: MessageHandler) => void }).onMessage = (
    type,
    handler
  ) => {
    handlers.set(type, handler);
  };
  (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;
  (room as unknown as { lock: typeof lock }).lock = lock;
  (room as unknown as { setMetadata: typeof setMetadata }).setMetadata = setMetadata;
  Object.defineProperty(room, 'metadata', {
    value: {
      roomName: 'Test Room',
      hostName: 'Alice',
      mapSize: 'medium',
      isPrivate: false,
      isPlaying: false,
    },
    configurable: true,
  });
  Object.defineProperty(room, 'clock', {
    value: {
      start: vi.fn(),
      tick: vi.fn(),
      setInterval: vi.fn((callback: () => void) => {
        const delayed: FakeDelayed = {
          clear: vi.fn(),
          callback,
        };
        clockIntervals.push(delayed);
        return delayed;
      }),
    },
    configurable: true,
  });

  return { room, handlers, broadcast, clockIntervals, lock, setMetadata };
}

function createClient(sessionId: string): Client & { send: ReturnType<typeof vi.fn> } {
  return {
    sessionId,
    send: vi.fn(),
  } as unknown as Client & { send: ReturnType<typeof vi.fn> };
}

describe('GameRoom room protocol wiring', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('initializes game state, room options, validation systems, and all client message handlers', () => {
    const { room, handlers } = createRoomHarness();

    room.onCreate({ mapSize: 'large' });

    expect(room.state).toBeInstanceOf(GameState);
    expect(room.state.roomId).toBe('game-room-test');
    expect(room.state.mapConfig.size).toBe('large');
    expect(room.state.mapConfig.width).toBe(PVP_CONFIG.mapSizes.large.width);
    expect(room.state.mapConfig.height).toBe(PVP_CONFIG.mapSizes.large.height);
    expect(room.maxClients).toBe(PVP_CONFIG.maxPlayers);
    expect(room.autoDispose).toBe(true);

    expect(room.state._visionSystem).toBe((room as any).visionSystem);
    expect((room as any).territoryCalc).toBeDefined();
    expect((room as any).energyCalc).toBeDefined();
    expect((room as any).combatSystem).toBeDefined();
    expect((room as any).inputValidator).toBeDefined();
    expect((room as any).mineManager).toBeDefined();

    expect(Array.from(handlers.keys()).sort()).toEqual([...REGISTERED_CLIENT_MESSAGES].sort());
  });

  it('joins players into state, metadata, bases, vision maps, and broadcasts player_joined', () => {
    const { room, broadcast } = createRoomHarness();
    room.onCreate({ mapSize: 'small' });

    const alice = createClient('alice-session');
    const bob = createClient('bob-session');

    room.onJoin(alice, { playerName: 'Alice' });
    room.onJoin(bob, { playerName: 'Bob' });

    const aliceState = room.state.players.get('alice-session')!;
    const bobState = room.state.players.get('bob-session')!;

    expect(aliceState.name).toBe('Alice');
    expect(aliceState.playerIndex).toBe(0);
    expect(aliceState.sessionId).toBe('alice-session');
    expect(aliceState.money).toBe(PVP_CONFIG.initialMoney);
    expect(aliceState.basePosition.x).toBe(
      PVP_CONFIG.mapSizes.small.width * PVP_CONFIG.basePositions[0].xRatio
    );
    expect(aliceState.basePosition.y).toBe(
      PVP_CONFIG.mapSizes.small.height * PVP_CONFIG.basePositions[0].yRatio
    );

    expect(bobState.name).toBe('Bob');
    expect(bobState.playerIndex).toBe(1);
    expect(bobState.sessionId).toBe('bob-session');
    expect(bobState.money).toBe(PVP_CONFIG.initialMoney);
    expect(bobState.basePosition.x).toBe(
      PVP_CONFIG.mapSizes.small.width * PVP_CONFIG.basePositions[1].xRatio
    );
    expect(bobState.basePosition.y).toBe(
      PVP_CONFIG.mapSizes.small.height * PVP_CONFIG.basePositions[1].yRatio
    );

    expect((alice as any).metadata).toEqual({
      playerId: 'alice-session',
      playerName: 'Alice',
    });
    expect((bob as any).metadata).toEqual({
      playerId: 'bob-session',
      playerName: 'Bob',
    });

    const bases = Array.from(room.state.buildings.values()).filter((building) => building.isBase);
    expect(bases).toHaveLength(2);
    expect(bases.map((base) => base.ownerId).sort()).toEqual(['alice-session', 'bob-session']);
    expect(bases.find((base) => base.ownerId === 'alice-session')).toMatchObject({
      buildingType: 'RootBuilding',
      hp: 10000,
      maxHp: 10000,
      radius: 30,
    });

    expect((room as any).visionSystem._maps.has('alice-session')).toBe(true);
    expect((room as any).visionSystem._maps.has('bob-session')).toBe(true);
    expect(broadcast).toHaveBeenNthCalledWith(1, ServerMessage.PLAYER_JOINED, {
      playerId: 'alice-session',
      playerName: 'Alice',
      playerIndex: 0,
    });
    expect(broadcast).toHaveBeenNthCalledWith(2, ServerMessage.PLAYER_JOINED, {
      playerId: 'bob-session',
      playerName: 'Bob',
      playerIndex: 1,
    });
  });

  it.each([
    [ClientMessage.PLAYER_READY, 'handlePlayerReady', undefined],
    [ClientMessage.PLAYER_NOT_READY, 'handlePlayerNotReady', undefined],
    [ClientMessage.BUILD_TOWER, 'handleBuildTower', { towerType: 'BasicTower', x: 10, y: 20 }],
    [ClientMessage.BUILD_BUILDING, 'handleBuildBuilding', { buildingType: 'Wall', x: 10, y: 20 }],
    [ClientMessage.UPGRADE_TOWER, 'handleUpgradeTower', { towerId: 'tower-1', targetType: 'Tower2' }],
    [ClientMessage.SELL_TOWER, 'handleSellTower', { towerId: 'tower-1' }],
    [
      ClientMessage.SPAWN_MONSTER,
      'handleSpawnMonster',
      { spawnerId: 'spawner-1', monsterType: 'Normal', targetPlayerId: 'target-player' },
    ],
    [ClientMessage.CANNON_FIRE, 'handleCannonFire', { towerId: 'tower-1', targetX: 30, targetY: 40 }],
    [
      ClientMessage.CANNON_SET_AUTO_TARGET,
      'handleCannonSetAutoTarget',
      { towerId: 'tower-1', targetX: 30, targetY: 40, radius: 100 },
    ],
    [ClientMessage.SURRENDER, 'handleSurrender', undefined],
    [ClientMessage.UPGRADE_MINE, 'handleUpgradeMine', { mineId: 'mine-1' }],
    [ClientMessage.REPAIR_MINE, 'handleRepairMine', { mineId: 'mine-1' }],
    [ClientMessage.DOWNGRADE_MINE, 'handleDowngradeMine', { mineId: 'mine-1' }],
    [ClientMessage.SELL_MINE, 'handleSellMine', { mineId: 'mine-1' }],
    [ClientMessage.UPGRADE_VISION, 'handleUpgradeVision', { towerId: 'tower-1', visionType: 'observer' }],
  ])(
    'rejects %s through rate limiter before running %s',
    (messageType, handlerName, payload) => {
      const { room, handlers } = createRoomHarness();
      room.onCreate({ mapSize: 'medium' });

      const actionHandler = vi.fn();
      (room as any)[handlerName] = actionHandler;
      (room as any).rateLimiter = {
        consume: vi.fn(() => false),
        isConfigured: vi.fn(() => true),
      };

      const client = createClient('limited-client');
      const handler = handlers.get(messageType);

      expect(handler).toBeDefined();
      handler!(client, payload);

      expect((room as any).rateLimiter.consume).toHaveBeenCalledWith(
        'limited-client',
        messageType
      );
      expect(actionHandler).not.toHaveBeenCalled();
      expect(client.send).toHaveBeenCalledWith(ServerMessage.ACTION_REJECTED, {
        action: messageType,
        reason: 'Rate limit exceeded',
        errorCode: 'RATE_LIMITED',
        requestId: undefined,
      });
    }
  );

  it('cancels the start countdown when a ready player becomes not ready', () => {
    const { room, handlers, broadcast, clockIntervals } = createRoomHarness();
    room.onCreate({ mapSize: 'medium' });
    const alice = createClient('alice-session');
    const bob = createClient('bob-session');
    room.onJoin(alice, { playerName: 'Alice' });
    room.onJoin(bob, { playerName: 'Bob' });

    handlers.get(ClientMessage.PLAYER_READY)!(alice);
    handlers.get(ClientMessage.PLAYER_READY)!(bob);

    expect(room.state.phase).toBe(GamePhase.STARTING);
    expect(room.state.countdownTicks).toBe(180);
    expect(clockIntervals).toHaveLength(1);
    expect(broadcast).toHaveBeenCalledWith(ServerMessage.GAME_STARTING, {
      countdownSeconds: 3,
    });

    handlers.get(ClientMessage.PLAYER_NOT_READY)!(alice);

    expect(room.state.phase).toBe(GamePhase.WAITING);
    expect(room.state.countdownTicks).toBe(0);
    expect(room.state.players.get('alice-session')?.isReady).toBe(false);
    expect(room.state.players.get('bob-session')?.isReady).toBe(true);
    expect(clockIntervals[0].clear).toHaveBeenCalledOnce();
  });

  it('treats leaving during the start countdown as a pre-game leave', async () => {
    const { room, handlers, broadcast, clockIntervals } = createRoomHarness();
    room.onCreate({ mapSize: 'medium' });
    const alice = createClient('alice-session');
    const bob = createClient('bob-session');
    room.onJoin(alice, { playerName: 'Alice' });
    room.onJoin(bob, { playerName: 'Bob' });

    handlers.get(ClientMessage.PLAYER_READY)!(alice);
    handlers.get(ClientMessage.PLAYER_READY)!(bob);

    await room.onLeave(alice, true);

    expect(room.state.phase).toBe(GamePhase.WAITING);
    expect(room.state.countdownTicks).toBe(0);
    expect(room.state.players.has('alice-session')).toBe(false);
    expect(room.state.players.has('bob-session')).toBe(true);
    expect(Array.from(room.state.buildings.values()).map((building) => building.ownerId)).toEqual([
      'bob-session',
    ]);
    expect(clockIntervals[0].clear).toHaveBeenCalledOnce();
    expect(broadcast).toHaveBeenCalledWith(ServerMessage.PLAYER_LEFT, {
      playerId: 'alice-session',
    });
  });

  it('locks the room, marks metadata playing, and starts the game after countdown', () => {
    const { room, handlers, broadcast, clockIntervals, lock, setMetadata } = createRoomHarness();
    room.onCreate({ mapSize: 'medium' });
    const alice = createClient('alice-session');
    const bob = createClient('bob-session');
    room.onJoin(alice, { playerName: 'Alice' });
    room.onJoin(bob, { playerName: 'Bob' });

    handlers.get(ClientMessage.PLAYER_READY)!(alice);
    handlers.get(ClientMessage.PLAYER_READY)!(bob);
    clockIntervals[0].callback();
    clockIntervals[0].callback();
    clockIntervals[0].callback();

    expect(room.state.phase).toBe(GamePhase.PLAYING);
    expect(room.state.currentTick).toBe(0);
    expect(room.state.countdownTicks).toBe(0);
    expect(room.state.wave.nextWaveTime).toBe(300);
    expect(lock).toHaveBeenCalledOnce();
    expect(setMetadata).toHaveBeenCalledWith({
      roomName: 'Test Room',
      hostName: 'Alice',
      mapSize: 'medium',
      isPrivate: false,
      isPlaying: true,
    });
    expect(broadcast).toHaveBeenCalledWith(ServerMessage.GAME_STARTED, {});
    expect(clockIntervals[0].clear).toHaveBeenCalledOnce();
    expect(clockIntervals).toHaveLength(2);
  });

  it('marks metadata not playing when the game ends or the room is disposed', () => {
    const { room, setMetadata, clockIntervals } = createRoomHarness();
    room.onCreate({ mapSize: 'medium' });
    (room as any).startGame();

    (room as any).endGame('alice-session', 'test_end');

    expect(room.state.phase).toBe(GamePhase.ENDED);
    expect(setMetadata).toHaveBeenCalledWith(expect.objectContaining({ isPlaying: true }));
    expect(setMetadata).toHaveBeenCalledWith(expect.objectContaining({ isPlaying: false }));
    expect(clockIntervals[0].clear).toHaveBeenCalledOnce();

    room.onDispose();

    expect(setMetadata).toHaveBeenLastCalledWith(expect.objectContaining({ isPlaying: false }));
  });
});
