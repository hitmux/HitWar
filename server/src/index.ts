/**
 * Colyseus Server Entry Point
 * Main server for Cannon War multiplayer
 */
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import { createServer } from 'http';
import { SERVER_CONFIG } from './config.js';
import { GameRoom } from './rooms/GameRoom.js';
import { LobbyRoom } from './rooms/LobbyRoom.js';

const app = express();

// Enable JSON body parsing
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// CORS middleware for development
if (SERVER_CONFIG.isDev) {
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
}

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 3000,
    pingMaxRetries: 3,
  }),
});

// Register game rooms
gameServer.define('lobby', LobbyRoom);
gameServer.define('game', GameRoom).enableRealtimeListing();

// Colyseus monitor (development only)
if (SERVER_CONFIG.isDev) {
  app.use('/colyseus', monitor());
}

// Start server
httpServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          Cannon War Multiplayer Server                  ║
╠════════════════════════════════════════════════════════╣
║  Status: Running                                        ║
║  Host:   ${SERVER_CONFIG.host.padEnd(45)}║
║  Port:   ${String(SERVER_CONFIG.port).padEnd(45)}║
║  Mode:   ${(SERVER_CONFIG.isDev ? 'Development' : 'Production').padEnd(45)}║
╚════════════════════════════════════════════════════════╝
  `);

  if (SERVER_CONFIG.isDev) {
    console.log(`  Monitor: http://localhost:${SERVER_CONFIG.port}/colyseus\n`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  gameServer.gracefullyShutdown().then(() => {
    console.log('Server shut down complete');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  gameServer.gracefullyShutdown().then(() => {
    console.log('Server shut down complete');
    process.exit(0);
  });
});
