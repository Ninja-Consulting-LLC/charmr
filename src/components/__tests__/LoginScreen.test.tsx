import {useNavigation} from '@react-navigation/native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../screens/LoginScreen';
import {mockAsyncStorage} from '../../test/mocks';
import {DevUtils} from '../../utils/devUtils';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock DevUtils
jest.mock('../../utils/devUtils', () => ({
  DevUtils: {
    shouldBypassAuth: jest.fn(),
  },
}));

// Mock console.error
const originalConsoleError = console.error;
console.error = jest.fn();

describe('LoginScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({navigate: mockNavigate});
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(false);
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('renders correctly', () => {
    const {getByTestId} = render(<LoginScreen />);

    // Check if main elements are rendered using testIDs
    expect(getByTestId('logo-placeholder')).toBeTruthy();
    expect(getByTestId('app-title')).toBeTruthy();
    expect(getByTestId('app-subtitle')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('get-started-button')).toBeTruthy();
  });

  it('matches snapshot in normal mode', () => {
    const {toJSON} = render(<LoginScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot in dev mode', () => {
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(true);
    const {toJSON} = render(<LoginScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles login button press correctly', async () => {
    const {getByTestId} = render(<LoginScreen />);

    // Press the login button using testID
    fireEvent.press(getByTestId('login-button'));

    // Verify AsyncStorage was called
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'isAuthenticated',
        'true',
      );
    });

    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('handles login error gracefully', async () => {
    // Mock AsyncStorage to throw an error
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

    const {getByTestId} = render(<LoginScreen />);

    // Press the login button
    fireEvent.press(getByTestId('login-button'));

    // Verify AsyncStorage was called
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'isAuthenticated',
        'true',
      );
    });

    // Verify navigation was not called on error
    expect(mockNavigate).not.toHaveBeenCalled();

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith(
      'Error during login:',
      expect.any(Error),
    );
  });

  it('handles get started button press correctly', () => {
    const {getByTestId} = render(<LoginScreen />);

    // Press the get started button using testID
    fireEvent.press(getByTestId('get-started-button'));

    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('Onboarding');
  });

  it('shows skip to home button in dev mode', () => {
    // Enable dev mode
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(true);

    const {getByTestId} = render(<LoginScreen />);

    // Check if dev button is rendered using testID
    expect(getByTestId('skip-to-home-button')).toBeTruthy();
  });

  it('handles skip to home button press in dev mode', () => {
    // Enable dev mode
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(true);

    const {getByTestId} = render(<LoginScreen />);

    // Press the skip to home button using testID
    fireEvent.press(getByTestId('skip-to-home-button'));

    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('does not show skip to home button in non-dev mode', () => {
    // Disable dev mode
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(false);

    const {queryByTestId} = render(<LoginScreen />);

    // Check if dev button is not rendered using testID
    expect(queryByTestId('skip-to-home-button')).toBeNull();
  });
});
