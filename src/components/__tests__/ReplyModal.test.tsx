import Clipboard from '@react-native-clipboard/clipboard';
import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import ReplyModal from '../ReplyModal';

describe('ReplyModal', () => {
  const mockProps = {
    visible: true,
    onDismiss: jest.fn(),
    reply: 'Test reply message',
    onFinish: jest.fn(),
    onCopy: jest.fn(),
    onModifyResponse: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with all required props', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    expect(getByTestId('copy-button')).toBeTruthy();
  });

  it('calls onCopy and Clipboard.setString when copy button is pressed', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const copyButton = getByTestId('copy-button');

    fireEvent.press(copyButton);

    expect(Clipboard.setString).toHaveBeenCalledWith(mockProps.reply);
    expect(mockProps.onCopy).toHaveBeenCalled();
  });

  it('calls onModifyResponse when Modify Response button is pressed', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const modifyButton = getByTestId('modify-button');

    fireEvent.press(modifyButton);

    expect(mockProps.onModifyResponse).toHaveBeenCalled();
  });

  it('calls onFinish when Finish button is pressed', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const finishButton = getByTestId('finish-button');

    fireEvent.press(finishButton);

    expect(mockProps.onFinish).toHaveBeenCalled();
  });

  it('has onDismiss prop', () => {
    render(<ReplyModal {...mockProps} />);
    expect(mockProps.onDismiss).toBeDefined();
  });

  // New test cases
  it('displays the correct reply text', () => {
    const {getByText} = render(<ReplyModal {...mockProps} />);
    expect(getByText(mockProps.reply)).toBeTruthy();
  });

  it('shows the correct title', () => {
    const {getByText} = render(<ReplyModal {...mockProps} />);
    expect(getByText('Generated Reply')).toBeTruthy();
  });

  it('displays the return message', () => {
    const {getByText} = render(<ReplyModal {...mockProps} />);
    expect(
      getByText('Return to your dating app to paste the message'),
    ).toBeTruthy();
  });

  it('displays the modify message', () => {
    const {getByText} = render(<ReplyModal {...mockProps} />);
    const modifyText = getByText(/Not happy with this response\?/);
    expect(modifyText).toBeTruthy();
    expect(modifyText.props.children).toContain(
      'Modify your prompt to generate a new one',
    );
  });

  it('renders with correct button labels', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const modifyButton = getByTestId('modify-button');
    const finishButton = getByTestId('finish-button');

    expect(modifyButton.props.children).toBe('Modify Response');
    expect(finishButton.props.children).toBe('Finish');
  });

  it('applies correct styling to the modal container', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const modal = getByTestId('modal');
    expect(modal.props.contentContainerStyle).toEqual(
      expect.objectContaining({
        padding: 16,
      }),
    );
  });

  it('handles visibility prop correctly', () => {
    const {getByTestId, rerender} = render(<ReplyModal {...mockProps} />);
    expect(getByTestId('modal').props.visible).toBe(true);

    rerender(<ReplyModal {...mockProps} visible={false} />);
    expect(getByTestId('modal').props.visible).toBe(false);
  });

  it('calls onDismiss when modal is dismissed', () => {
    const {getByTestId} = render(<ReplyModal {...mockProps} />);
    const modal = getByTestId('modal');

    fireEvent(modal, 'onDismiss');
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });
});
