/**
 * Colyseus Server Entry Point
 * Main server for Cannon War multiplayer
 */
import { createServer } from 'http';
import { SERVER_CONFIG } from './config.js';
import { createCannonWarApp, createCannonWarServer } from './server.js';

const app = createCannonWarApp({
  isDev: SERVER_CONFIG.isDev,
  enableMonitor: SERVER_CONFIG.isDev,
});
const httpServer = createServer(app);
const gameServer = createCannonWarServer(httpServer);

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
