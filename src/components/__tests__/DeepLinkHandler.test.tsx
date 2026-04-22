import {NavigationContainer} from '@react-navigation/native';
import {act, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Linking} from 'react-native';
import {DeepLinkHandler} from '../DeepLinkHandler';

const mockNavigate = jest.fn();
const mockPickImages = jest.fn();
const mockRemove = jest.fn();

let mockUrlHandler: ((e: {url: string}) => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  useNavigation: () => ({navigate: mockNavigate}),
}));

jest.mock('../../hooks/useImagePicker', () => ({
  useImagePicker: () => ({pickImages: mockPickImages}),
}));

jest.mock('../../store/StoreProvider', () => ({
  useStore: () => ({user: {id: 'test-user'}}),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    deepLink: {debug: jest.fn(), error: jest.fn()},
  },
}));

function renderHandler() {
  return render(
    <NavigationContainer>
      <DeepLinkHandler />
    </NavigationContainer>,
  );
}

describe('DeepLinkHandler', () => {
  let addSpy: jest.SpyInstance;
  let initialSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlHandler = undefined;
    mockRemove.mockClear();
    mockPickImages.mockResolvedValue(undefined);

    addSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_event, handler) => {
        mockUrlHandler = handler as (e: {url: string}) => void;
        return {remove: mockRemove} as unknown as ReturnType<
          typeof Linking.addEventListener
        >;
      });
    initialSpy = jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(null);
  });

  afterEach(() => {
    addSpy.mockRestore();
    initialSpy.mockRestore();
  });

  it('subscribes to Linking and checks initial URL', async () => {
    renderHandler();
    await waitFor(() => expect(addSpy).toHaveBeenCalled());
    expect(initialSpy).toHaveBeenCalled();
    expect(mockUrlHandler).toEqual(expect.any(Function));
  });

  it('navigates Home for charmr://open/homescreen initial URL', async () => {
    initialSpy.mockResolvedValue('charmr://open/homescreen');
    renderHandler();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Home' as never),
    );
  });

  it('handles homescreen URL from runtime link event', async () => {
    renderHandler();
    await waitFor(() => expect(mockUrlHandler).toBeDefined());
    await act(async () => {
      mockUrlHandler?.({url: 'x charmr://open/homescreen y'});
    });
    expect(mockNavigate).toHaveBeenCalledWith('Home' as never);
  });

  it('does not navigate for unknown URL pattern', async () => {
    initialSpy.mockResolvedValue('https://example.com');
    renderHandler();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('after screenshot deep link, opens picker after delay', async () => {
    jest.useFakeTimers();
    initialSpy.mockResolvedValue('charmr://open/screenshot');
    renderHandler();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Home' as never));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(mockPickImages).toHaveBeenCalled());
    jest.useRealTimers();
  });

  it('removes subscription on unmount', async () => {
    const {unmount} = renderHandler();
    await waitFor(() => expect(addSpy).toHaveBeenCalled());
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });
});
