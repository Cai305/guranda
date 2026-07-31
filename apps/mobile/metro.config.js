const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  
  const { assetExts } = config.resolver;
  if (!assetExts.includes('ogg')) {
    config.resolver.assetExts = [...assetExts, 'ogg'];
  }

  // Allow Metro to resolve files outside the app root (monorepo support)
  config.watchFolders = [monorepoRoot];

  // Alias @mxit2/types directly to the TypeScript source so no pre-compilation
  // step is needed (Metro handles .ts natively via Expo's Babel transformer)
  config.resolver.extraNodeModules = {
    '@mxit2/types': path.resolve(monorepoRoot, 'packages/types/src'),
  };

  return config;
})();
