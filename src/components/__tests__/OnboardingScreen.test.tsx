import {useNavigation} from '@react-navigation/native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import OnboardingScreen from '../../screens/OnboardingScreen';
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

describe('OnboardingScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({navigate: mockNavigate});
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(false);
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('matches snapshot for step 1', () => {
    const {toJSON} = render(<OnboardingScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders first step content correctly', () => {
    const {getByText} = render(<OnboardingScreen />);

    expect(getByText('Enable Dating Keyboard')).toBeTruthy();
    expect(
      getByText('Follow these steps to enable Dating Buddy keyboard:'),
    ).toBeTruthy();
    expect(getByText('1. Go to Settings')).toBeTruthy();
    expect(getByText('6. Select Dating Buddy')).toBeTruthy();
  });

  it('navigates through steps when clicking next', () => {
    const {getByTestId, getByText} = render(<OnboardingScreen />);

    // Step 1
    expect(getByText('Enable Dating Keyboard')).toBeTruthy();

    // Go to Step 2
    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    expect(getByText('Set as Default Keyboard')).toBeTruthy();

    // Go to Step 3
    fireEvent.press(nextButton);
    expect(getByText('Register for Better Experience')).toBeTruthy();

    // Verify Step 1 content is not visible
    expect(() => getByText('Enable Dating Keyboard')).toThrow();
  });

  it('shows Register button on last step', () => {
    const {getByTestId} = render(<OnboardingScreen />);

    // Go to last step
    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    fireEvent.press(nextButton);

    expect(getByTestId('register-button')).toBeTruthy();
  });

  it('handles completion in normal mode', async () => {
    const {getByTestId} = render(<OnboardingScreen />);

    // Go to last step
    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    fireEvent.press(nextButton);
    fireEvent.press(getByTestId('register-button'));

    // Verify AsyncStorage was called
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'hasOnboarded',
        'true',
      );
    });

    // Verify navigation to Login screen
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('handles completion in dev mode', async () => {
    (DevUtils.shouldBypassAuth as jest.Mock).mockReturnValue(true);
    const {getByTestId} = render(<OnboardingScreen />);

    // Go to last step
    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    fireEvent.press(nextButton);
    fireEvent.press(getByTestId('register-button'));

    // Verify AsyncStorage was called
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'hasOnboarded',
        'true',
      );
    });

    // Verify navigation to Home screen in dev mode
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('handles skip button press', async () => {
    const {getByTestId} = render(<OnboardingScreen />);

    fireEvent.press(getByTestId('skip-button'));

    // Verify AsyncStorage was called
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'hasOnboarded',
        'true',
      );
    });

    // Verify navigation to Login screen
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('handles AsyncStorage error gracefully', async () => {
    // Mock AsyncStorage to throw an error
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

    const {getByTestId} = render(<OnboardingScreen />);

    fireEvent.press(getByTestId('skip-button'));

    // Verify error was logged
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Error saving onboarding status:',
        expect.any(Error),
      );
    });

    // Verify navigation was not called
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
