/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  // Optional peer of @react-navigation/elements; we do not use MaskedView in app code.
  dependencies: {
    '@react-native-masked-view/masked-view': {
      platforms: {ios: null, android: null},
    },
  },
};
