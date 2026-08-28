const reactNativePreset = require('@react-native/jest-preset');

module.exports = {
  ...reactNativePreset,
  transform: {
    ...reactNativePreset.transform,
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
