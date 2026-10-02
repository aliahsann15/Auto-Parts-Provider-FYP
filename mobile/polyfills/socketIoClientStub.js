// Minimal stub for socket.io-client to keep the app bundling/running when the package
// cannot be installed (e.g., offline). This does NOT provide realtime updates;
// the UI will fall back to polling for new messages.

function createStubSocket() {
  const handlers = {};

  const socket = {
    connected: true,
    on(event, cb) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(cb);
      if (event === 'connect') {
        setTimeout(() => cb(), 0);
      }
    },
    off(event) {
      if (event && handlers[event]) delete handlers[event];
    },
    emit() {
      // no-op
    },
    disconnect() {
      // no-op
    },
  };

  return socket;
}

function io() {
  return createStubSocket();
}

module.exports = { io };
