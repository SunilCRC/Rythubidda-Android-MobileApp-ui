module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-worklets MUST be listed LAST.
    // Reanimated 4 uses worklets for its babel plugin (formerly 'react-native-reanimated/plugin').
    'react-native-worklets/plugin',
  ],
};
