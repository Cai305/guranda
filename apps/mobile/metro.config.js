const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  
  const { assetExts } = config.resolver;
  if (!assetExts.includes('ogg')) {
    config.resolver.assetExts = [...assetExts, 'ogg'];
  }
  
  return config;
})();
