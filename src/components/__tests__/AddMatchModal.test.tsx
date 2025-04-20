import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import AddMatchModal from '../AddMatchModal';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('AddMatchModal', () => {
  const mockProps = {
    visible: true,
    onDismiss: jest.fn(),
    onAdd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const {getByText} = renderWithProvider(<AddMatchModal {...mockProps} />);
    expect(getByText('Add New Match')).toBeTruthy();
  });

  it('handles name input correctly', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);
    const nameInput = getByTestId('text-input-flat');

    fireEvent.changeText(nameInput, 'John Doe');
    expect(nameInput.props.value).toBe('John Doe');
  });

  it('handles platform selection correctly', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);

    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);

    // Button should now be in contained mode
    expect(hingeButton.props.mode).toBe('contained');
  });

  it('shows error when trying to add without selecting platform', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);

    // Add name but don't select platform
    const nameInput = getByTestId('text-input-flat');
    fireEvent.changeText(nameInput, 'John Doe');

    // Try to add without selecting platform
    const addButton = getByTestId('add-button');
    fireEvent.press(addButton);

    const errorText = getByTestId('platform-error');
    expect(errorText.props.children).toBe('Please select a platform');
  });

  it('does not call onAdd when name is empty', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);

    // Select platform but leave name empty
    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);

    const addButton = getByTestId('add-button');
    fireEvent.press(addButton);

    expect(mockProps.onAdd).not.toHaveBeenCalled();
  });

  it('calls onAdd with correct data when form is valid', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);

    // Fill in name
    const nameInput = getByTestId('text-input-flat');
    fireEvent.changeText(nameInput, 'John Doe');

    // Select platform
    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);

    // Submit form
    const addButton = getByTestId('add-button');
    fireEvent.press(addButton);

    expect(mockProps.onAdd).toHaveBeenCalledWith('John Doe', 'hinge');
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('clears form and error on successful submission', () => {
    const {getByTestId, queryByText} = renderWithProvider(
      <AddMatchModal {...mockProps} />,
    );

    // Fill form and submit
    const nameInput = getByTestId('text-input-flat');
    fireEvent.changeText(nameInput, 'John Doe');

    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);

    const addButton = getByTestId('add-button');
    fireEvent.press(addButton);

    // Rerender to check cleared state
    const {getByTestId: getByTestIdAfter, queryByText: queryByTextAfter} =
      renderWithProvider(<AddMatchModal {...mockProps} />);
    const nameInputAfter = getByTestIdAfter('text-input-flat');

    expect(nameInputAfter.props.value).toBe('');
    expect(queryByTextAfter('Please select a platform')).toBeNull();
  });

  it('calls onDismiss when close button is pressed', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);
    const closeButton = getByTestId('close-button');

    fireEvent.press(closeButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('calls onDismiss when Cancel button is pressed', () => {
    const {getByTestId} = renderWithProvider(<AddMatchModal {...mockProps} />);
    const cancelButton = getByTestId('cancel-button');

    fireEvent.press(cancelButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('clears platform error when platform is selected', () => {
    const {getByTestId, queryByTestId} = renderWithProvider(
      <AddMatchModal {...mockProps} />,
    );

    // Add name but don't select platform
    const nameInput = getByTestId('text-input-flat');
    fireEvent.changeText(nameInput, 'John Doe');

    // Trigger error first
    const addButton = getByTestId('add-button');
    fireEvent.press(addButton);
    const errorText = getByTestId('platform-error');
    expect(errorText.props.children).toBe('Please select a platform');

    // Select platform
    const hingeButton = getByTestId('platform-hinge-button');
    fireEvent.press(hingeButton);

    // Error should be cleared
    expect(queryByTestId('platform-error')).toBeNull();
  });
});
