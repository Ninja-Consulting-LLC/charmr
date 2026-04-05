import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import SupportContactModal from '../SupportContactModal';
import {useStore} from '../../store/StoreProvider';
import {SubscriptionTier} from '../../types/enums';

const mockSubmitSupportRequest = jest.fn().mockResolvedValue({});

jest.mock('../../services/api', () => ({
  submitSupportRequest: (...args: unknown[]) => mockSubmitSupportRequest(...args),
}));

jest.mock('../../store/StoreProvider', () => ({
  useStore: jest.fn(),
}));

const baseUser = {
  id: 'u1',
  plan: SubscriptionTier.FREE,
  dailyMessagesUsed: 0,
  extraMessages: 0,
  lastResetDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  getDailyMessageLimit: () => 5,
};

describe('SupportContactModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitSupportRequest.mockResolvedValue({});
  });

  it('disables email field when user has email and authBypass is off', () => {
    (useStore as jest.Mock).mockReturnValue({
      userId: 'anon-1',
      user: {...baseUser, email: 'locked@example.com'},
      authBypass: false,
    });

    render(<SupportContactModal visible onDismiss={jest.fn()} mode="support" />);

    const emailInput = screen.getByTestId('email-input');
    expect(emailInput.props.editable).toBe(false);
  });

  it('keeps email editable when authBypass is true', () => {
    (useStore as jest.Mock).mockReturnValue({
      userId: 'anon-1',
      user: {...baseUser, email: 'locked@example.com'},
      authBypass: true,
    });

    render(<SupportContactModal visible onDismiss={jest.fn()} mode="support" />);

    const emailInput = screen.getByTestId('email-input');
    expect(emailInput.props.editable).not.toBe(false);
    fireEvent.changeText(emailInput, 'edited@example.com');
    expect(emailInput.props.value).toBe('edited@example.com');
  });

  it('renders optional phone and sends it with the support request', async () => {
    (useStore as jest.Mock).mockReturnValue({
      userId: 'anon-1',
      user: {...baseUser, email: undefined, name: 'Tester'},
      authBypass: true,
    });

    render(<SupportContactModal visible onDismiss={jest.fn()} mode="support" />);

    expect(screen.getByTestId('phone-input')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('email-input'), 'withphone@example.com');
    fireEvent.changeText(screen.getByTestId('phone-input'), '+1 555 123 4567');
    fireEvent.changeText(screen.getByTestId('message-input'), 'Need help with matches');

    fireEvent.press(screen.getByTestId('send-message-button'));

    await waitFor(() => {
      expect(mockSubmitSupportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'withphone@example.com',
          phone: '+1 555 123 4567',
          message: 'Need help with matches',
          userId: 'anon-1',
        }),
        true,
      );
    });
  });
});
