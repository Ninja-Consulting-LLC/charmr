import React from 'react';
import {screen} from '@testing-library/react-native';
import {useStore} from '../../store';
import {SubscriptionTier} from '../../types/enums';
import {renderWithProviders} from '../../test/test-utils';
import UserMenuSlideout from '../UserMenuSlideout';

jest.mock('../../store', () => ({
  useStore: jest.fn(),
  StoreProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

describe('UserMenuSlideout', () => {
  const mockOnDismiss = jest.fn();
  const mockOnOpenSupport = jest.fn();
  const mockOnMatchesUpdated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display correct daily message count for free user', () => {
    const mockUser = {
      id: 'test-user-id',
      plan: SubscriptionTier.FREE,
      dailyMessagesUsed: 3,
      extraMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      getDailyMessageLimit: () => 5,
      email: 'test@example.com',
      name: 'Test User',
      installationId: 'test-installation',
      createdAt: new Date().toISOString(),
    };

    (useStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: jest.fn(),
      isAuthenticated: true,
      setIsAuthenticated: jest.fn(),
      handleProviderLogin: jest.fn(),
    });

    renderWithProviders(
      <UserMenuSlideout
        visible={true}
        onDismiss={mockOnDismiss}
        onOpenSupport={mockOnOpenSupport}
        onMatchesUpdated={mockOnMatchesUpdated}
      />,
    );

    // Check that the daily message count is displayed correctly
    expect(screen.getByText('3/5 used')).toBeTruthy();
  });

  it('should display unlimited for pro user', () => {
    const mockUser = {
      id: 'test-user-id',
      plan: SubscriptionTier.PRO,
      dailyMessagesUsed: 10,
      extraMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      getDailyMessageLimit: () => Infinity,
      email: 'test@example.com',
      name: 'Test User',
      installationId: 'test-installation',
      createdAt: new Date().toISOString(),
    };

    (useStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: jest.fn(),
      isAuthenticated: true,
      setIsAuthenticated: jest.fn(),
      handleProviderLogin: jest.fn(),
    });

    renderWithProviders(
      <UserMenuSlideout
        visible={true}
        onDismiss={mockOnDismiss}
        onOpenSupport={mockOnOpenSupport}
        onMatchesUpdated={mockOnMatchesUpdated}
      />,
    );

    // Check that unlimited is displayed for pro users
    expect(screen.getByText('Unlimited')).toBeTruthy();
  });

  it('should update display when user message count changes', () => {
    const mockUser = {
      id: 'test-user-id',
      plan: SubscriptionTier.FREE,
      dailyMessagesUsed: 1,
      extraMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      getDailyMessageLimit: () => 5,
      email: 'test@example.com',
      name: 'Test User',
      installationId: 'test-installation',
      createdAt: new Date().toISOString(),
    };

    const mockSetUser = jest.fn();

    (useStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      isAuthenticated: true,
      setIsAuthenticated: jest.fn(),
      handleProviderLogin: jest.fn(),
    });

    const {rerender} = renderWithProviders(
      <UserMenuSlideout
        visible={true}
        onDismiss={mockOnDismiss}
        onOpenSupport={mockOnOpenSupport}
        onMatchesUpdated={mockOnMatchesUpdated}
      />,
    );

    // Initially shows 1/5 used
    expect(screen.getByText('1/5 used')).toBeTruthy();

    // Update user with new message count
    const updatedUser = {
      ...mockUser,
      dailyMessagesUsed: 4,
    };

    (useStore as jest.Mock).mockReturnValue({
      user: updatedUser,
      setUser: mockSetUser,
      isAuthenticated: true,
      setIsAuthenticated: jest.fn(),
      handleProviderLogin: jest.fn(),
    });

    // Re-render with updated user
    rerender(
      <UserMenuSlideout
        visible={true}
        onDismiss={mockOnDismiss}
        onOpenSupport={mockOnOpenSupport}
        onMatchesUpdated={mockOnMatchesUpdated}
      />,
    );

    // Should now show 4/5 used
    expect(screen.getByText('4/5 used')).toBeTruthy();
  });
});
