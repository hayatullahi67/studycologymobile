// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to force using the 'main' field (CommonJS) instead of 'exports' (ESM/mjs)
// This resolves the issue where 'zustand' (and potentially others) ship 'import.meta' in their .mjs files
config.resolver.unstable_enablePackageExports = false;
config.resolver.unstable_conditionNames = ['require', 'import', 'react-native'];

// Ensure we prefer standard resolution fields
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
