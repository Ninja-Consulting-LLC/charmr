import React from 'react';
import {Pressable, StyleSheet, Text as RNText, View} from 'react-native';
import {IconButton, Modal, Portal, Switch, Text} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {theme} from '../theme/theme';
import TypingIndicator from './TypingIndicator';

interface ReplyModalProps {
  visible: boolean;
  onDismiss: () => void;
  reply: string;
  onDone: () => void;
  onCopy: () => void;
  onDeleteScreenshots: (value: boolean) => void;
  deleteScreenshots: boolean;
  hasScreenshots: boolean;
  onRegenerate: () => void;
  loading?: boolean;
}

const ReplyModal: React.FC<ReplyModalProps> = ({
  visible,
  onDismiss,
  reply,
  onDone,
  onCopy,
  onDeleteScreenshots,
  deleteScreenshots,
  hasScreenshots,
  onRegenerate,
  loading = false,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {}}
        contentContainerStyle={styles.modalContainer}>
        <View style={styles.overflowContainer}>
          <View testID="reply-modal" style={styles.modalContent}>
            {/* Reply Text */}
            <Pressable onPress={onCopy} style={styles.replyContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <TypingIndicator />
                </View>
              ) : (
                <>
                  <RNText
                    testID="reply-modal-text"
                    accessibilityLabel={reply}
                    style={styles.replyText}>
                    {reply}
                  </RNText>
                  <IconButton
                    icon="content-copy"
                    size={20}
                    style={styles.copyIcon}
                    onPress={onCopy}
                  />
                </>
              )}
            </Pressable>

            {/* Delete Switch - Only show if screenshots were selected */}
            {hasScreenshots && !loading && (
              <View style={styles.deleteSection}>
                <Text variant="bodyMedium">
                  {MESSAGES.REPLY_MODAL_DELETE_HINT}
                </Text>
                <Switch
                  value={deleteScreenshots}
                  onValueChange={onDeleteScreenshots}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!loading && (
                <Pressable
                  onPress={onRegenerate}
                  style={styles.regenerateButton}>
                  <Text variant="bodyMedium" style={styles.regenerateText}>
                    Regenerate
                  </Text>
                </Pressable>
              )}
              <Pressable
                testID="reply-modal-done"
                onPress={onDone}
                style={styles.doneButton}>
                <Text variant="bodyMedium" style={styles.doneText}>
                  {MESSAGES.REPLY_MODAL_DONE}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
  },
  overflowContainer: {
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    minHeight: 100,
  },
  replyText: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.onSurface,
  },
  copyIcon: {
    margin: 0,
    opacity: 0.6,
  },
  deleteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneText: {
    color: theme.colors.onPrimary,
  },
  regenerateButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  regenerateText: {
    color: theme.colors.onSurfaceVariant,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReplyModal;
