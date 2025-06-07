import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {RootStackParamList} from '../../navigation/types';
import HomeScreen from '../../screens/HomeScreen';
import {useStore} from '../../store';

// Mock the store
jest.mock('../../store', () => ({
  useStore: jest.fn(),
}));

// Mock the components
jest.mock('../../components/DevMenu', () => {
  const mockReact = require('react');
  const {View} = require('react-native');
  return function MockDevMenu() {
    return mockReact.createElement(View, {testID: 'dev-menu'}, 'Mock DevMenu');
  };
});

jest.mock('../../components/ResponseGenerator', () => {
  const mockReact = require('react');
  const {View} = require('react-native');
  return function MockResponseGenerator() {
    return mockReact.createElement(
      View,
      {testID: 'response-generator'},
      'Mock ResponseGenerator',
    );
  };
});

// Mock store values
const mockSetShowDevMenu = jest.fn();
(useStore as jest.Mock).mockReturnValue({
  setShowDevMenu: mockSetShowDevMenu,
  showDevMenu: false,
});

// Mock navigation
const mockNavigation: Partial<
  NativeStackNavigationProp<RootStackParamList, 'Home'>
> = {
  navigate: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};

const mockProps: NativeStackScreenProps<RootStackParamList, 'Home'> = {
  navigation: mockNavigation as NativeStackNavigationProp<
    RootStackParamList,
    'Home'
  >,
  route: {
    key: 'Home',
    name: 'Home',
    params: undefined,
  },
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store mock to default values before each test
    (useStore as jest.Mock).mockReturnValue({
      setShowDevMenu: mockSetShowDevMenu,
      showDevMenu: false,
    });
  });

  it('matches snapshot in production mode', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = false;
    const {toJSON} = render(<HomeScreen {...mockProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot in development mode', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = true;
    const {toJSON} = render(<HomeScreen {...mockProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title correctly', () => {
    const {getByText} = render(<HomeScreen {...mockProps} />);
    expect(getByText('Charmr')).toBeTruthy();
  });

  it('shows dev menu button in dev mode', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = true;
    const {getByTestId} = render(<HomeScreen {...mockProps} />);
    expect(getByTestId('dev-menu-button')).toBeTruthy();
  });

  it('hides dev menu button in production mode', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = false;
    const {queryByTestId} = render(<HomeScreen {...mockProps} />);
    expect(queryByTestId('dev-menu-button')).toBeNull();
  });

  it('opens dev menu when clicking dev button', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = true;
    const {getByTestId} = render(<HomeScreen {...mockProps} />);

    fireEvent.press(getByTestId('dev-menu-button'));
    expect(mockSetShowDevMenu).toHaveBeenCalledWith(true);
  });

  it('renders ResponseGenerator component', () => {
    const {getByTestId} = render(<HomeScreen {...mockProps} />);
    expect(getByTestId('response-generator')).toBeTruthy();
  });

  it('renders DevMenu component in dev mode when menu is open', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = true;
    (useStore as jest.Mock).mockReturnValue({
      setShowDevMenu: mockSetShowDevMenu,
      showDevMenu: true,
    });

    const {getByTestId} = render(<HomeScreen {...mockProps} />);
    expect(getByTestId('dev-menu')).toBeTruthy();
  });

  it('does not render DevMenu component in production mode', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = false;
    (useStore as jest.Mock).mockReturnValue({
      setShowDevMenu: mockSetShowDevMenu,
      showDevMenu: true,
    });

    const {queryByTestId} = render(<HomeScreen {...mockProps} />);
    expect(queryByTestId('dev-menu')).toBeNull();
  });

  it('does not render DevMenu component when menu is closed', () => {
    // @ts-ignore - we're mocking __DEV__
    global.__DEV__ = true;
    (useStore as jest.Mock).mockReturnValue({
      setShowDevMenu: mockSetShowDevMenu,
      showDevMenu: false,
    });

    const {queryByTestId} = render(<HomeScreen {...mockProps} />);
    expect(queryByTestId('dev-menu')).toBeNull();
  });
});
