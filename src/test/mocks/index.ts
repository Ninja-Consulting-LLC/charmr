import {mockAsyncStorage, mockCameraRoll, mockClipboard} from './nativeModules';
import {mockImagePicker, mockPaperComponents} from './thirdPartyLibs';

export const registerMocks = () => {
  // Native modules
  jest.mock(
    '@react-native-async-storage/async-storage',
    () => mockAsyncStorage,
  );
  jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);
  jest.mock('@react-native-camera-roll/camera-roll', () => mockCameraRoll);
  jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: {
      fetch: jest.fn(() =>
        Promise.resolve({
          type: 'wifi',
          isConnected: true,
          isInternetReachable: true,
        }),
      ),
      addEventListener: jest.fn(() => jest.fn()),
      configure: jest.fn(),
    },
  }));

  // Third-party libraries
  jest.mock('react-native-image-crop-picker', () => mockImagePicker);

  // UI Components
  jest.mock('react-native-paper', () => {
    const RealComponent = jest.requireActual('react-native-paper');
    return {
      ...RealComponent,
      ...mockPaperComponents,
    };
  });
};

// Export individual mocks for direct use in tests
export {
  mockAsyncStorage,
  mockCameraRoll,
  mockClipboard,
  mockImagePicker,
  mockPaperComponents,
};
