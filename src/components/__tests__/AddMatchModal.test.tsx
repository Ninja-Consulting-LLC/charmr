import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import AddEditMatchModal from '../AddEditMatchModal';
import {theme} from '../../theme/theme';

const renderWithProvider = (component: React.ReactElement) =>
  render(<PaperProvider theme={theme}>{component}</PaperProvider>);

describe('AddEditMatchModal', () => {
  const mockOnAddMatch = jest.fn().mockResolvedValue(undefined);

  const mockProps = {
    visible: true,
    onDismiss: jest.fn(),
    onAddMatch: mockOnAddMatch,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAddMatch.mockResolvedValue(undefined);
  });

  it('renders correctly when visible', () => {
    const {getByText} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    expect(getByText('Add New Match')).toBeTruthy();
  });

  it('handles name input correctly', () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    const nameInput = getByTestId('text-input-outlined');
    fireEvent.changeText(nameInput, 'John Doe');
    expect(nameInput.props.value).toBe('John Doe');
  });

  it('handles platform selection correctly', () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);
    expect(hingeButton.props.mode).toBe('contained');
  });

  it('shows error when trying to add without selecting platform', () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.changeText(getByTestId('text-input-outlined'), 'John Doe');
    fireEvent.press(getByTestId('add-button'));
    const errorText = getByTestId('platform-error');
    expect(errorText.props.children).toBe('Please select a platform');
  });

  it('does not call onAddMatch when name is empty', () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.press(getByTestId('platform-hinge-button'));
    fireEvent.press(getByTestId('add-button'));
    expect(mockOnAddMatch).not.toHaveBeenCalled();
  });

  it('calls onAddMatch with correct data when form is valid', async () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.changeText(getByTestId('text-input-outlined'), 'John Doe');
    fireEvent.press(getByTestId('platform-hinge-button'));
    fireEvent.press(getByTestId('add-button'));
    await waitFor(() => {
      expect(mockOnAddMatch).toHaveBeenCalledWith('John Doe', 'hinge');
    });
    expect(mockProps.onDismiss).not.toHaveBeenCalled();
  });

  it('clears form after successful submission', async () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.changeText(getByTestId('text-input-outlined'), 'John Doe');
    fireEvent.press(getByTestId('platform-hinge-button'));
    fireEvent.press(getByTestId('add-button'));
    await waitFor(() => {
      expect(mockOnAddMatch).toHaveBeenCalled();
      expect(getByTestId('text-input-outlined').props.value).toBe('');
    });
  });

  it('calls onDismiss when close button is pressed', () => {
    const {getByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.press(getByTestId('add-edit-match-close'));
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('clears platform error when platform is selected', () => {
    const {getByTestId, queryByTestId} = renderWithProvider(
      <AddEditMatchModal {...mockProps} />,
    );
    fireEvent.changeText(getByTestId('text-input-outlined'), 'Jane');
    fireEvent.press(getByTestId('add-button'));
    expect(getByTestId('platform-error')).toBeTruthy();
    fireEvent.press(getByTestId('platform-hinge-button'));
    expect(queryByTestId('platform-error')).toBeNull();
  });
});
