import { matchMaker, type Server as ColyseusServer } from '@colyseus/core';
import { Client as ColyseusClient, type Room } from 'colyseus.js';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCannonWarApp, createCannonWarServer } from './server.js';
import { ClientMessage, LobbyMessage, ServerMessage } from './shared/types/messages.js';

function listen(httpServer: HttpServer): Promise<number> {
  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => {
      httpServer.off('error', reject);
      resolve((httpServer.address() as AddressInfo).port);
    });
  });
}

function closeHttpServer(httpServer: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!httpServer.listening) {
      resolve();
      return;
    }

    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function onceMessage<T>(room: Room, messageType: string): Promise<T> {
  return new Promise((resolve) => {
    const unsubscribe = room.onMessage(messageType, (payload: T) => {
      unsubscribe();
      resolve(payload);
    });
  });
}

async function waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  while (!(await predicate())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('multiplayer lifecycle integration', () => {
  let httpServer: HttpServer;
  let gameServer: ColyseusServer;
  let endpoint: string;
  const rooms: Room[] = [];

  beforeEach(async () => {
    const app = createCannonWarApp();
    httpServer = createServer(app);
    gameServer = createCannonWarServer(httpServer, {
      pingInterval: 1000,
      pingMaxRetries: 2,
      gracefullyShutdown: false,
    });
    const port = await listen(httpServer);
    endpoint = `ws://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await Promise.allSettled(rooms.splice(0).map((room) => room.leave(true)));
    await gameServer.gracefullyShutdown(false);
    await closeHttpServer(httpServer);
  });

  it('starts a locked game room from two real WebSocket clients', async () => {
    const aliceClient = new ColyseusClient(endpoint);
    const bobClient = new ColyseusClient(endpoint);

    const aliceLobby = await aliceClient.joinOrCreate('lobby', { playerName: 'Alice' });
    const bobLobby = await bobClient.joinOrCreate('lobby', { playerName: 'Bob' });
    rooms.push(aliceLobby, bobLobby);

    const createdRoom = onceMessage<{ roomId: string; reservation: unknown }>(
      aliceLobby,
      LobbyMessage.ROOM_CREATED
    );
    aliceLobby.send(LobbyMessage.CREATE_ROOM, {
      roomName: 'Integration Room',
      mapSize: 'small',
    });

    const createdPayload = await createdRoom;
    const aliceGame = await aliceClient.consumeSeatReservation(createdPayload.reservation);
    aliceGame.onMessage(ServerMessage.PLAYER_JOINED, () => {});
    aliceGame.onMessage(ServerMessage.PLAYER_ELIMINATED, () => {});
    aliceGame.onMessage(ServerMessage.GAME_ENDED, () => {});
    rooms.push(aliceGame);

    const joinPayloadPromise = onceMessage<{ roomId: string; reservation: unknown }>(
      bobLobby,
      LobbyMessage.MATCH_FOUND
    );
    bobLobby.send(LobbyMessage.JOIN_ROOM, { roomId: createdPayload.roomId });
    const joinPayload = await joinPayloadPromise;
    const bobGame = await bobClient.consumeSeatReservation(joinPayload.reservation);
    bobGame.onMessage(ServerMessage.PLAYER_JOINED, () => {});
    bobGame.onMessage(ServerMessage.PLAYER_LEFT, () => {});
    bobGame.onMessage(ServerMessage.PLAYER_ELIMINATED, () => {});
    bobGame.onMessage(ServerMessage.GAME_ENDED, () => {});
    rooms.push(bobGame);

    const aliceStarting = onceMessage<{ countdownSeconds: number }>(
      aliceGame,
      ServerMessage.GAME_STARTING
    );
    const bobStarting = onceMessage<{ countdownSeconds: number }>(
      bobGame,
      ServerMessage.GAME_STARTING
    );
    const aliceStarted = onceMessage(aliceGame, ServerMessage.GAME_STARTED);
    const bobStarted = onceMessage(bobGame, ServerMessage.GAME_STARTED);

    aliceGame.send(ClientMessage.PLAYER_READY);
    bobGame.send(ClientMessage.PLAYER_READY);

    await expect(aliceStarting).resolves.toEqual({ countdownSeconds: 3 });
    await expect(bobStarting).resolves.toEqual({ countdownSeconds: 3 });
    await Promise.all([aliceStarted, bobStarted]);

    let listings = await matchMaker.query({ roomId: createdPayload.roomId });
    await waitFor(async () => {
      listings = await matchMaker.query({ roomId: createdPayload.roomId });
      return listings[0]?.locked === true && listings[0]?.metadata?.isPlaying === true;
    }, 1000);

    expect(listings).toHaveLength(1);
    expect(listings[0].locked).toBe(true);
    expect(listings[0].metadata?.isPlaying).toBe(true);
  }, 10000);
});
