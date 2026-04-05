import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import LoginScreen from '../../screens/LoginScreen';
import {theme} from '../../theme/theme';

jest.mock('../../components/LoginModal', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: ({visible}: {visible: boolean}) =>
      visible ? <View testID="login-modal-visible" /> : null,
  };
});

jest.mock('../../store/StoreProvider', () => ({
  useStore: jest.fn(() => ({
    createNewUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({children, ...rest}: {children?: React.ReactNode}) =>
    React.createElement(View, {testID: 'linear-gradient', ...rest}, children);
});

const mockNavigate = jest.fn();

const renderLogin = () =>
  render(
    <PaperProvider theme={theme}>
      <LoginScreen
        navigation={{navigate: mockNavigate} as never}
        route={{key: 'login', name: 'Login', params: undefined}}
      />
    </PaperProvider>,
  );

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders primary actions', () => {
    const {getByTestId, getByText} = renderLogin();

    expect(getByTestId('get-started-button')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByText('Terms of Use')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const {toJSON} = renderLogin();
    expect(toJSON()).toMatchSnapshot();
  });

  it('opens login modal when Log In is pressed', () => {
    const {getByTestId, queryByTestId} = renderLogin();

    expect(queryByTestId('login-modal-visible')).toBeNull();
    fireEvent.press(getByTestId('login-button'));
    expect(getByTestId('login-modal-visible')).toBeTruthy();
  });

  it('navigates to onboarding when Get Started is pressed', () => {
    const {getByTestId} = renderLogin();

    fireEvent.press(getByTestId('get-started-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Onboarding');
  });
});
