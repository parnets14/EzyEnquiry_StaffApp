const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Block Android CMake/NDK build artifacts so Metro's FallbackWatcher
    // doesn't crash on ENOENT when Gradle creates/deletes temp dirs.
    blockList: [
      /node_modules\/.*\/android\/\.cxx\/.*/,
      /node_modules\/.*\/android\/build\/.*/,
      /node_modules\/.*\/android\/\.gradle\/.*/,
      /android\/\.cxx\/.*/,
      /android\/build\/.*/,
    ],
    // Keep package exports enabled so @react-native/* packages resolve correctly.
    // unstable_enablePackageExports defaults to true in RN 0.73+, leave it on.
  },
  watcher: {
    healthCheck: {
      enabled: true,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
