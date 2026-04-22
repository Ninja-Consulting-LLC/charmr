import AsyncStorage from '@react-native-async-storage/async-storage';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import axios from 'axios';
import React from 'react';
import {generateReply} from '../../services/api';
import {useStore} from '../../store';
import {SubscriptionTier} from '../../types/enums';
import {registerMocks} from '../../test/mocks';
import {renderWithProviders} from '../../test/test-utils';
import * as matchUtils from '../../utils/matchUtils';
import ResponseGenerator from '../ResponseGenerator';

registerMocks();

const mockFetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['test-image-data'])),
});
global.fetch = mockFetch;

jest.mock('axios', () => {
  const mockIsAxiosError = jest.fn().mockReturnValue(false);
  const mockAxiosInstance = Object.assign(jest.fn(), {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: {use: jest.fn(), eject: jest.fn()},
      response: {use: jest.fn(), eject: jest.fn()},
    },
  });
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      isAxiosError: mockIsAxiosError,
    },
    isAxiosError: mockIsAxiosError,
  };
});

jest.mock('../../utils/matchUtils', () => ({
  getMatches: jest.fn().mockResolvedValue([
    {
      id: 'm1',
      name: 'Test Match',
      platform: 'test-platform',
      lastUsed: Date.now(),
    },
  ]),
  addMatch: jest.fn(),
  updateMatchLastUsed: jest.fn(),
  deleteMatch: jest.fn(),
  generateMatchId: jest.fn().mockReturnValue('test-platform::Test Match'),
}));

jest.mock('../../store', () => ({
  useStore: jest.fn(),
  StoreProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

jest.mock('../../services/api', () => ({
  generateReply: jest.fn(),
}));

function mockStore(overrides: Record<string, unknown> = {}) {
  const loadMatches = jest.fn();
  return {
    userId: 'test-user-id',
    user: {plan: SubscriptionTier.FREE},
    skipRateLimiting: false,
    messageCount: 0,
    matches: [],
    loadMatches,
    addMatch: jest.fn(),
    updateMatch: jest.fn(),
    removeMatch: jest.fn(),
    selectedMatch: null,
    setSelectedMatch: jest.fn(),
    deleteScreenshots: false,
    setDeleteScreenshots: jest.fn(),
    setMatches: jest.fn(),
    setUser: jest.fn(),
    handleProviderLogin: jest.fn(),
    ...overrides,
  };
}

describe('ResponseGenerator', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as jest.Mock).mockImplementation(() => mockStore());
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (CameraRoll.deletePhotos as jest.Mock).mockResolvedValue({success: true});
    const ax = axios as unknown as {
      isAxiosError?: jest.Mock;
      default?: {isAxiosError: jest.Mock};
    };
    (ax.isAxiosError ?? ax.default?.isAxiosError)?.mockReturnValue(false);
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
    });
    (matchUtils.getMatches as jest.Mock).mockResolvedValue([
      {
        id: 'm1',
        name: 'Test Match',
        platform: 'test-platform',
        lastUsed: Date.now(),
      },
    ]);
  });

  it('renders root container', () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as never} />,
    );
    expect(getByTestId('response-generator-container')).toBeTruthy();
  });

  it('exposes image picker control', () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as never} />,
    );
    expect(getByTestId('image-picker-button')).toBeTruthy();
  });

  it('requests matches on mount', () => {
    const loadMatches = jest.fn();
    (useStore as jest.Mock).mockImplementation(() =>
      mockStore({loadMatches}),
    );
    renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as never} />,
    );
    expect(loadMatches).toHaveBeenCalled();
  });
});
