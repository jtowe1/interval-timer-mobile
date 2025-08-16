const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add audio file extensions to asset extensions
config.resolver.assetExts.push('wav', 'mp3', 'm4a', 'aac');

module.exports = config;