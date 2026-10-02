const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Force use-latest-callback to resolve to our shim to avoid default export issues
config.resolver = config.resolver || {};
const hasSocketIo = fs.existsSync(path.join(projectRoot, 'node_modules', 'socket.io-client'));
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'use-latest-callback': path.join(projectRoot, 'polyfills', 'useLatestCallbackShim.js'),
  // Fallback to stub only if socket.io-client is not installed (keeps bundling working offline)
  ...(hasSocketIo
    ? {}
    : { 'socket.io-client': path.join(projectRoot, 'polyfills', 'socketIoClientStub.js') }),
};

module.exports = config;
