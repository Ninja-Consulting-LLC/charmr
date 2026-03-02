import AsyncStorage from '@react-native-async-storage/async-storage';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {generateReply} from '../../services/api';
import {useStore} from '../../store';
import {mockClipboard, registerMocks} from '../../test/mocks';
import {renderWithProviders} from '../../test/test-utils';
import * as matchUtils from '../../utils/matchUtils';
import {Match} from '../../utils/matchUtils';
import ResponseGenerator from '../ResponseGenerator';

// Register all mocks
registerMocks();

// Mock fetch for image conversion
const mockFetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['test-image-data'])),
});
global.fetch = mockFetch;

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: jest.fn(),
  result: 'data:image/jpeg;base64,test-base64-data',
};
const MockFileReader = jest.fn(() => mockFileReader) as unknown as {
  new (): FileReader;
  prototype: FileReader;
  DONE: 2;
  EMPTY: 0;
  LOADING: 1;
};
MockFileReader.DONE = 2;
MockFileReader.EMPTY = 0;
MockFileReader.LOADING = 1;
global.FileReader = MockFileReader;

// Mock axios
const mockIsAxiosError = jest.fn().mockReturnValue(false);
const mockAxios = {
  isAxiosError: mockIsAxiosError,
  post: jest.fn(),
  default: {
    isAxiosError: mockIsAxiosError,
    post: jest.fn(),
  },
};
jest.mock('axios', () => mockAxios);

// Mock matchUtils
jest.mock('../../utils/matchUtils', () => ({
  getMatches: jest.fn().mockResolvedValue([
    {
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

// Mock the store
jest.mock('../../store', () => ({
  useStore: jest.fn(),
  StoreProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

// Mock the API service
jest.mock('../../services/api', () => ({
  generateReply: jest.fn(),
}));

describe('ResponseGenerator', () => {
  const mockUserId = 'test-user-id';
  const mockSkipRateLimiting = false;
  const mockImage = {
    path: 'test-image-path',
    localIdentifier: 'test-asset-id',
    mime: 'image/jpeg',
  };
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as jest.Mock).mockReturnValue({
      userId: mockUserId,
      skipRateLimiting: mockSkipRateLimiting,
      messageCount: 0,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (CameraRoll.deletePhotos as jest.Mock).mockResolvedValue({success: true});
    mockIsAxiosError.mockReturnValue(false);
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
    });
    (matchUtils.getMatches as jest.Mock).mockResolvedValue([
      {
        name: 'Test Match',
        platform: 'test-platform',
        lastUsed: Date.now(),
      },
    ]);
    (matchUtils.generateMatchId as jest.Mock).mockImplementation(
      (match: Match) => `${match.platform}::${match.name}`,
    );
  });

  // Snapshot Tests
  it('renders initial state correctly', () => {
    const {toJSON} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with selected images correctly', async () => {
    const {toJSON, getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);

    // Add an image
    fireEvent.press(getByTestId('image-picker-button'));

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders response modal correctly', async () => {
    const {toJSON, getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker and API
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);

    // Add image and generate response
    fireEvent.press(getByTestId('image-picker-button'));
    fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  // Existing Tests
  it('renders correctly', () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    expect(getByTestId('response-generator-container')).toBeTruthy();
    expect(getByTestId('image-picker-button')).toBeTruthy();
    expect(getByTestId('prompt-input')).toBeTruthy();
    expect(getByTestId('submit-button')).toBeTruthy();
  });

  it('shows error when submitting without images', async () => {
    const {getByTestId, getByText} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(getByText('Please select at least one image')).toBeTruthy();
    });
  });

  it('handles image selection correctly', async () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock the image picker response
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);

    fireEvent.press(getByTestId('image-picker-button'));

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });
  });

  it('handles image removal correctly', async () => {
    const {getByTestId, queryByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock the image picker response
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);

    // Add an image
    fireEvent.press(getByTestId('image-picker-button'));

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Remove the image
    fireEvent.press(getByTestId('remove-image-0'));

    await waitFor(() => {
      expect(queryByTestId('selected-image-0')).toBeNull();
    });
  });

  it('handles response generation correctly', async () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock the image picker response
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
    });

    // Add an image
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
      // Trigger FileReader onload
      mockFileReader.onload();
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  it('handles clipboard copy correctly', async () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Generate a response first to show the modal
    await act(async () => {
      // Mock image picker and add image
      jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
      fireEvent.press(getByTestId('image-picker-button'));

      // Generate response
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
      // Trigger FileReader onload
      mockFileReader.onload();
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });

    // Mock the clipboard
    mockClipboard.setString.mockResolvedValue(undefined);

    // Press copy button
    await act(async () => {
      fireEvent.press(getByTestId('copy-button'));
    });

    expect(mockClipboard.setString).toHaveBeenCalled();
  });

  it.skip('handles API errors correctly', async () => {
    const {getByTestId, getByText} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker and API error
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    (generateReply as jest.Mock).mockRejectedValue(
      new Error('API error message'),
    );

    // Add image
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
    });

    // Wait for error snackbar to appear
    await waitFor(() => {
      expect(getByTestId('error-snackbar')).toBeTruthy();
      expect(
        getByText('Failed to generate response. Please try again.'),
      ).toBeTruthy();
    });
  });

  it('handles image deletion correctly', async () => {
    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker and successful API response
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
    });

    // Add image
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
      // Trigger FileReader onload to simulate base64 conversion
      mockFileReader.onload();
    });

    // Wait for modal to appear
    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });

    // Press finish button to trigger deletion
    await act(async () => {
      fireEvent.press(getByTestId('finish-button'));
    });

    // Verify images are deleted
    await waitFor(() => {
      expect(CameraRoll.deletePhotos).toHaveBeenCalledWith(['test-asset-id']);
    });
  });

  it.skip('handles modal dismissal correctly', async () => {
    const {getByTestId, queryByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker and successful API response
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
    });

    // Add image
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
      // Trigger FileReader onload to simulate base64 conversion
      mockFileReader.onload();
    });

    // Wait for modal to appear
    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });

    // Press finish button and wait for state updates
    await act(async () => {
      fireEvent.press(getByTestId('finish-button'));
    });

    // Wait for modal to disappear and images to be cleared
    await waitFor(
      () => {
        expect(queryByTestId('modal')).toBeNull();
        expect(queryByTestId('selected-image-0')).toBeNull();
      },
      {timeout: 2000},
    );
  });

  it.skip('should show error snackbar when API call fails', async () => {
    const errorMessage = 'API Error';
    (generateReply as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const {getByTestId, getByText} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Add an image
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
    });

    // Wait for error snackbar to appear
    await waitFor(() => {
      expect(getByTestId('error-snackbar')).toBeTruthy();
      expect(
        getByText('Failed to generate response. Please try again.'),
      ).toBeTruthy();
    });
  });

  it('should update user message limits after successful response generation', async () => {
    const mockSetUser = jest.fn();
    const mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    (useStore as jest.Mock).mockReturnValue({
      userId: mockUserId,
      skipRateLimiting: mockSkipRateLimiting,
      messageCount: 0,
      setUser: mockSetUser,
    });

    // Mock successful API response with updated limits
    (generateReply as jest.Mock).mockResolvedValue({
      reply: 'Generated response text',
      error: null,
      limits: {
        dailyMessagesUsed: 3,
        extraMessages: 2,
      },
    });

    const {getByTestId} = renderWithProviders(
      <ResponseGenerator navigation={mockNavigation as any} />,
    );

    // Mock image picker and add image
    jest.spyOn(ImagePicker, 'openPicker').mockResolvedValue(mockImage);
    await act(async () => {
      fireEvent.press(getByTestId('image-picker-button'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-image-0')).toBeTruthy();
    });

    // Set prompt and generate response
    await act(async () => {
      fireEvent.changeText(getByTestId('prompt-input'), 'Test prompt');
      fireEvent.press(getByTestId('submit-button'));
      // Trigger FileReader onload to simulate base64 conversion
      mockFileReader.onload();
    });

    // Wait for modal to appear and verify user state was updated
    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
      expect(mockSetUser).toHaveBeenCalledWith({
        dailyMessagesUsed: 3,
        extraMessages: 2,
      });
    });
  });
});
