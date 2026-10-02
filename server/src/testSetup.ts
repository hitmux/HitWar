// Colyseus 0.16 optionally initializes @pm2/io. Vitest's fork workers expose
// process.send(), but expect a different IPC payload shape, so keep the PM2
// transport disabled during tests. Production processes retain the normal IPC
// channel.
if (typeof process.send === 'function') {
  Object.defineProperty(process, 'send', {
    configurable: true,
    value: undefined,
  });
}
