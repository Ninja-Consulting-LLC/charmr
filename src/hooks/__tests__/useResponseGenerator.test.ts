import {act, renderHook} from '@testing-library/react-native';
import {MESSAGES} from '../../constants/messages';
import {generateReply} from '../../services/api';
import {useStore} from '../../store';
import {MessageMode, SubscriptionTier} from '../../types/enums';
import {Match} from '../../utils/matchUtils';
import {useResponseGenerator} from '../useResponseGenerator';

// Mock the API service
jest.mock('../../services/api', () => ({
  generateReply: jest.fn(),
}));

// Mock the store
jest.mock('../../store', () => ({
  useStore: jest.fn(),
}));

describe('useResponseGenerator', () => {
  const mockSetUser = jest.fn();
  const mockUserId = 'test-user-id';
  const mockSelectedMatch: Match = {
    id: 'test-match-id',
    name: 'Test Match',
    platform: 'tinder',
    lastUsed: Date.now().toString(),
    userId: 'test-user-id',
    hidden: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as jest.Mock).mockReturnValue({
      userId: mockUserId,
      setUser: mockSetUser,
      user: {},
    });
  });

  it('does not call API and sets NO_IMAGES when no images and blank prompt', async () => {
    const {result} = renderHook(() =>
      useResponseGenerator({
        images: [],
        selectedMatch: mockSelectedMatch,
        userPlan: SubscriptionTier.FREE,
        onMessageLimitReached: jest.fn(),
        mode: MessageMode.GENERATE,
      }),
    );

    await act(async () => {
      await result.current.generateResponse('   ');
    });

    expect(generateReply).not.toHaveBeenCalled();
    expect(result.current.error).toBe(MESSAGES.NO_IMAGES);
    expect(result.current.errorType).toBe('NO_IMAGES');
  });

  it('should update user message limits after successful response generation', async () => {
    // Mock successful API response with updated limits
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
      limits: {
        dailyMessagesUsed: 3,
        extraMessages: 2,
      },
    });

    const {result} = renderHook(() =>
      useResponseGenerator({
        images: [],
        selectedMatch: mockSelectedMatch,
        userPlan: SubscriptionTier.FREE,
        onMessageLimitReached: jest.fn(),
        mode: MessageMode.GENERATE,
      }),
    );

    // Generate a response
    await act(async () => {
      await result.current.generateResponse('Test prompt');
    });

    // Verify that setUser was called with the updated limits
    expect(mockSetUser).toHaveBeenCalledWith({
      dailyMessagesUsed: 3,
      extraMessages: 2,
    });
  });

  it('should not update user state when API returns an error', async () => {
    // Mock API error response
    (generateReply as jest.Mock).mockResolvedValue({
      reply: '',
      error: 'API Error',
      type: 'GENERATION_ERROR',
    });

    const {result} = renderHook(() =>
      useResponseGenerator({
        images: [],
        selectedMatch: mockSelectedMatch,
        userPlan: SubscriptionTier.FREE,
        onMessageLimitReached: jest.fn(),
        mode: MessageMode.GENERATE,
      }),
    );

    // Generate a response
    await act(async () => {
      await result.current.generateResponse('Test prompt');
    });

    // Verify that setUser was not called
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('should not update user state when API response has no limits', async () => {
    // Mock successful API response without limits
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
      // No limits property
    });

    const {result} = renderHook(() =>
      useResponseGenerator({
        images: [],
        selectedMatch: mockSelectedMatch,
        userPlan: SubscriptionTier.FREE,
        onMessageLimitReached: jest.fn(),
        mode: MessageMode.GENERATE,
      }),
    );

    // Generate a response
    await act(async () => {
      await result.current.generateResponse('Test prompt');
    });

    // Verify that setUser was not called
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});
