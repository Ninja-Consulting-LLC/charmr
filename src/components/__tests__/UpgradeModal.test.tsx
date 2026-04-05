import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import {MESSAGES} from '../../constants/messages';
import {theme} from '../../theme/theme';
import UpgradeModal from '../UpgradeModal';

jest.mock('../../services/revenueCatService', () => ({
  getProPaywall: jest.fn(() => Promise.resolve(null)),
  handlePurchase: jest.fn(),
}));

jest.mock('../../store', () => ({
  useStore: jest.fn(() => ({
    user: {email: 'user@test.com', installationId: 'install-1'},
    setUser: jest.fn(),
    handleProviderLogin: jest.fn(),
  })),
}));

const renderWithProvider = (component: React.ReactElement) =>
  render(
    <PaperProvider theme={theme}>{component}</PaperProvider>,
  );

describe('UpgradeModal', () => {
  const mockProps = {
    visible: true,
    onDismiss: jest.fn(),
    showRateLimitMessage: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title when visible', async () => {
    const {getByText} = renderWithProvider(<UpgradeModal {...mockProps} />);
    await waitFor(() => {
      expect(getByText('Upgrade Your Plan')).toBeTruthy();
    });
  });

  it('shows empty state when no packages load', async () => {
    const {getByText} = renderWithProvider(<UpgradeModal {...mockProps} />);
    await waitFor(() => {
      expect(getByText('No subscription options available.')).toBeTruthy();
    });
  });

  it('shows rate limit copy when showRateLimitMessage is true', async () => {
    const {getByText} = renderWithProvider(
      <UpgradeModal {...mockProps} showRateLimitMessage />,
    );
    await waitFor(() => {
      expect(getByText(MESSAGES.RATE_LIMIT)).toBeTruthy();
    });
  });

  it('calls onDismiss when Close is pressed', async () => {
    const {findByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);
    fireEvent.press(await findByTestId('upgrade-modal-close'));
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });
});
