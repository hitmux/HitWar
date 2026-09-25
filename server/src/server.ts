import { Server as ColyseusServer } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express, { type Application, type Express } from 'express';
import type { Server as HttpServer } from 'http';
import { GameRoom } from './rooms/GameRoom.js';
import { LobbyRoom } from './rooms/LobbyRoom.js';

interface CannonWarAppOptions {
  isDev?: boolean;
  enableMonitor?: boolean;
}

interface CannonWarServerOptions {
  pingInterval?: number;
  pingMaxRetries?: number;
  gracefullyShutdown?: boolean;
}

export function createCannonWarApp(options: CannonWarAppOptions = {}): Express {
  const app = express();
  configureCannonWarApp(app, options);
  return app;
}

function configureCannonWarApp(app: Application, options: CannonWarAppOptions = {}): void {
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  if (options.isDev) {
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  if (options.enableMonitor) {
    app.use('/colyseus', monitor());
  }
}

export function createCannonWarServer(
  httpServer: HttpServer,
  options: CannonWarServerOptions = {}
): ColyseusServer {
  const gameServer = new ColyseusServer({
    gracefullyShutdown: options.gracefullyShutdown ?? true,
    transport: new WebSocketTransport({
      server: httpServer,
      pingInterval: options.pingInterval ?? 3000,
      pingMaxRetries: options.pingMaxRetries ?? 3,
    }),
  });

  gameServer.define('lobby', LobbyRoom);
  gameServer.define('game', GameRoom).enableRealtimeListing();

  return gameServer;
}
