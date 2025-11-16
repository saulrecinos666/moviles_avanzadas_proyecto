// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuración para servidor remoto
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

// Permitir conexiones desde cualquier origen (para Render)
config.server.rewriteRequestUrl = (url) => {
  if (!url.includes('://')) {
    return url;
  }
  return url;
};

module.exports = config;
