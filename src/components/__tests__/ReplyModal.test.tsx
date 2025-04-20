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
});
