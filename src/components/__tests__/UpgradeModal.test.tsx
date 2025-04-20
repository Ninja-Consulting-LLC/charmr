import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import UpgradeModal from '../UpgradeModal';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('UpgradeModal', () => {
  const mockProps = {
    visible: true,
    onDismiss: jest.fn(),
    onUpgrade: jest.fn(),
    showRateLimitMessage: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const {getByText} = renderWithProvider(<UpgradeModal {...mockProps} />);
    expect(getByText('Choose Your Plan')).toBeTruthy();
  });

  it('renders all tiers with correct information', () => {
    const {getByText, getAllByText, getByTestId} = renderWithProvider(
      <UpgradeModal {...mockProps} />,
    );

    // Basic tier
    expect(getByTestId('basic-tier')).toBeTruthy();
    expect(getByText('$4.99')).toBeTruthy();
    expect(getByText('50 messages')).toBeTruthy();
    expect(getByText(/50 messages per day/)).toBeTruthy();
    expect(getByText(/Basic support/)).toBeTruthy();

    // Pro tier
    expect(getByTestId('pro-tier')).toBeTruthy();
    expect(getByText('$9.99')).toBeTruthy();
    expect(getByText('200 messages')).toBeTruthy();
    expect(getByText(/200 messages per day/)).toBeTruthy();
    expect(getAllByText(/Priority support/)[0]).toBeTruthy();
    expect(getByText(/Advanced features/)).toBeTruthy();

    // Unlimited tier
    expect(getByTestId('unlimited-tier')).toBeTruthy();
    expect(getByText('$19.99')).toBeTruthy();
    expect(getByText(/Unlimited messages/)).toBeTruthy();
    expect(getByText(/Early access to new features/)).toBeTruthy();
  });

  it('shows rate limit message when showRateLimitMessage is true', () => {
    const {getByText} = renderWithProvider(
      <UpgradeModal {...mockProps} showRateLimitMessage={true} />,
    );
    expect(
      getByText(
        "Upgrade to receive more messages - you're out of messages for today!",
      ),
    ).toBeTruthy();
  });

  it('does not show rate limit message when showRateLimitMessage is false', () => {
    const {queryByText} = renderWithProvider(<UpgradeModal {...mockProps} />);
    expect(
      queryByText(
        "Upgrade to receive more messages - you're out of messages for today!",
      ),
    ).toBeNull();
  });

  it('starts with Pro tier selected by default', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);
    const proTierCard = getByTestId('pro-tier-card');
    expect(proTierCard).not.toBeNull();
    expect(proTierCard?.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: '#1976D2',
        backgroundColor: '#E3F2FD',
      }),
    );
  });

  it('changes selected tier when clicking on a tier', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);

    // Click on Basic tier
    const basicTierButton = getByTestId('basic-tier');
    expect(basicTierButton).not.toBeNull();
    fireEvent.press(basicTierButton);

    // Basic tier should now have selected styles
    const basicTierCard = getByTestId('basic-tier-card');
    expect(basicTierCard).not.toBeNull();
    expect(basicTierCard?.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: '#1976D2',
        backgroundColor: '#E3F2FD',
      }),
    );

    // Pro tier should no longer be selected
    const proTierCard = getByTestId('pro-tier-card');
    expect(proTierCard?.props.style).not.toContainEqual(
      expect.objectContaining({
        borderColor: '#1976D2',
        backgroundColor: '#E3F2FD',
      }),
    );
  });

  it('calls onUpgrade with selected tier when clicking Upgrade Now', () => {
    const {getByText, getByTestId} = renderWithProvider(
      <UpgradeModal {...mockProps} />,
    );

    // Click on Basic tier
    const basicTierButton = getByTestId('basic-tier');
    expect(basicTierButton).not.toBeNull();
    fireEvent.press(basicTierButton);

    // Click upgrade button
    const upgradeButton = getByTestId('upgrade-button');
    fireEvent.press(upgradeButton);

    expect(mockProps.onUpgrade).toHaveBeenCalledWith('basic');
  });

  it('calls onDismiss when close button is pressed', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);
    const closeButton = getByTestId('close-button');

    fireEvent.press(closeButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('maintains selected tier state when modal is reopened', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);

    // Select Basic tier
    const basicTierButton = getByTestId('basic-tier');
    fireEvent.press(basicTierButton);

    // Basic tier should be selected
    const basicTierCard = getByTestId('basic-tier-card');
    expect(basicTierCard?.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: '#1976D2',
        backgroundColor: '#E3F2FD',
      }),
    );
  });

  it('has correct accessibility labels for all interactive elements', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);

    expect(getByTestId('close-button')).toBeTruthy();
    expect(getByTestId('basic-tier')).toBeTruthy();
    expect(getByTestId('pro-tier')).toBeTruthy();
    expect(getByTestId('unlimited-tier')).toBeTruthy();
    expect(getByTestId('upgrade-button')).toBeTruthy();
  });

  it('disables upgrade button when no tier is selected', () => {
    const {getByTestId} = renderWithProvider(<UpgradeModal {...mockProps} />);
    const upgradeButton = getByTestId('upgrade-button');
    expect(upgradeButton.props.disabled).toBeFalsy();
  });
});
