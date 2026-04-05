import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import ReplyModal from '../ReplyModal';
import {MESSAGES} from '../../constants/messages';
import {theme} from '../../theme/theme';

const renderModal = (ui: React.ReactElement) =>
  render(<PaperProvider theme={theme}>{ui}</PaperProvider>);

describe('ReplyModal', () => {
  const baseProps = {
    visible: true,
    onDismiss: jest.fn(),
    reply: 'Test reply message',
    onDone: jest.fn(),
    onCopy: jest.fn(),
    onDeleteScreenshots: jest.fn(),
    deleteScreenshots: false,
    hasScreenshots: false,
    onRegenerate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reply text and action labels', () => {
    const {getByText} = renderModal(<ReplyModal {...baseProps} />);
    expect(getByText(baseProps.reply)).toBeTruthy();
    expect(getByText(MESSAGES.REPLY_MODAL_DONE)).toBeTruthy();
    expect(getByText('Regenerate')).toBeTruthy();
  });

  it('calls onCopy when reply area is pressed', () => {
    const {getByText} = renderModal(<ReplyModal {...baseProps} />);
    fireEvent.press(getByText(baseProps.reply));
    expect(baseProps.onCopy).toHaveBeenCalled();
  });

  it('calls onDone when Done is pressed', () => {
    const {getByText} = renderModal(<ReplyModal {...baseProps} />);
    fireEvent.press(getByText(MESSAGES.REPLY_MODAL_DONE));
    expect(baseProps.onDone).toHaveBeenCalled();
  });

  it('calls onRegenerate when Regenerate is pressed', () => {
    const {getByText} = renderModal(<ReplyModal {...baseProps} />);
    fireEvent.press(getByText('Regenerate'));
    expect(baseProps.onRegenerate).toHaveBeenCalled();
  });

  it('shows delete hint and switch when hasScreenshots', () => {
    const {getByText} = renderModal(
      <ReplyModal {...baseProps} hasScreenshots />,
    );
    expect(getByText(MESSAGES.REPLY_MODAL_DELETE_HINT)).toBeTruthy();
  });

  it('shows TypingIndicator when loading', () => {
    const {queryByText} = renderModal(
      <ReplyModal {...baseProps} loading />,
    );
    expect(queryByText(baseProps.reply)).toBeNull();
  });
});
