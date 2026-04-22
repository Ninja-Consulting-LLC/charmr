import {useNavigation} from '@react-navigation/native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import OnboardingScreen from '../../screens/OnboardingScreen';
import {theme} from '../../theme/theme';
import {mockAsyncStorage} from '../../test/mocks';

jest.mock('../../components/LoginModal', () => {
  const React = require('react');
  const {Pressable, Text} = require('react-native');
  return {
    __esModule: true,
    default: ({
      visible,
      onLoginSuccess,
    }: {
      visible: boolean;
      onLoginSuccess?: () => void;
    }) =>
      visible ? (
        <Pressable
          testID="stub-login-success"
          onPress={() => onLoginSuccess?.()}>
          <Text>Stub login</Text>
        </Pressable>
      ) : null,
  };
});

jest.mock('../../store/StoreProvider', () => ({
  useStore: jest.fn(() => ({
    createNewUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const originalConsoleError = console.error;
console.error = jest.fn();

const renderOnboarding = () =>
  render(
    <PaperProvider theme={theme}>
      <OnboardingScreen />
    </PaperProvider>,
  );

describe('OnboardingScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({navigate: mockNavigate});
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('matches snapshot for step 1', () => {
    const {toJSON} = renderOnboarding();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders first step content correctly', () => {
    const {getByText} = renderOnboarding();

    expect(getByText('Set up the Charmr keyboard')).toBeTruthy();
    expect(
      getByText(
        'Charmr works from your keyboard like any language keyboard. Add it once in Settings. After that you can use it in dating apps, texts, and more.',
      ),
    ).toBeTruthy();
    expect(getByText('1. Open Settings')).toBeTruthy();
    expect(
      getByText('6. Choose Charmr, then allow Full Access if asked'),
    ).toBeTruthy();
  });

  it('navigates through steps when clicking next', () => {
    const {getByTestId, getByText} = renderOnboarding();

    expect(getByText('Set up the Charmr keyboard')).toBeTruthy();

    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    expect(getByText('Pick Charmr when you type')).toBeTruthy();

    fireEvent.press(nextButton);
    expect(getByText('Sign in to save your progress')).toBeTruthy();

    expect(() => getByText('Set up the Charmr keyboard')).toThrow();
  });

  it('shows create-account button on last step', () => {
    const {getByTestId} = renderOnboarding();

    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);
    fireEvent.press(nextButton);

    expect(getByTestId('register-button')).toBeTruthy();
  });

  it('persists onboarding and navigates home after login success', async () => {
    const {getByTestId} = renderOnboarding();

    fireEvent.press(getByTestId('next-button'));
    fireEvent.press(getByTestId('next-button'));
    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(getByTestId('stub-login-success')).toBeTruthy();
    });
    fireEvent.press(getByTestId('stub-login-success'));

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'hasOnboarded',
        'true',
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('handles skip button press', async () => {
    const {getByTestId} = renderOnboarding();

    fireEvent.press(getByTestId('skip-button'));

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'hasOnboarded',
        'true',
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('handles AsyncStorage error gracefully', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

    const {getByTestId} = renderOnboarding();

    fireEvent.press(getByTestId('skip-button'));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Error creating user:',
        expect.any(Error),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
