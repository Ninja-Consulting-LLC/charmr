import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Modal, Portal, Switch, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
import {MESSAGES} from '../constants/messages';
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
  onDismiss: _onDismiss,
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
        theme={darkModalPaperTheme}
        onDismiss={() => {}}
        contentContainerStyle={paperModalContent.shell}>
        <ModalSheet padded style={styles.card}>
          <ThemeProvider theme={darkModalPaperTheme}>
            <Pressable
              onPress={onCopy}
              style={styles.replyPressable}
              accessibilityRole="summary">
              {loading ? (
                <View style={styles.loadingContainer}>
                  <TypingIndicator />
                </View>
              ) : (
                <>
                  <AppText
                    testID="reply-modal-text"
                    accessibilityLabel={reply}
                    variant="body"
                    color="hero"
                    style={styles.replyNativeText}>
                    {reply}
                  </AppText>
                  <ModalIconButton
                    icon="content-copy"
                    size={36}
                    style={styles.copyIcon}
                    onPress={onCopy}
                    accessibilityLabel="Copy reply"
                  />
                </>
              )}
            </Pressable>

            {hasScreenshots && !loading && (
              <View style={styles.deleteSection}>
                <AppText variant="bodyMedium" color="heroMuted" style={styles.deleteHint}>
                  {MESSAGES.REPLY_MODAL_DELETE_HINT}
                </AppText>
                <Switch
                  value={deleteScreenshots}
                  onValueChange={onDeleteScreenshots}
                  trackColor={{
                    false: 'rgba(255, 255, 255, 0.28)',
                    true: tokens.color.accent.mint,
                  }}
                />
              </View>
            )}

            <View style={styles.actionButtons}>
              {!loading && (
                <CharmrButton
                  label="Regenerate"
                  variant="outline"
                  onPress={onRegenerate}
                  style={styles.actionBtn}
                />
              )}
              <CharmrButton
                testID="reply-modal-done"
                label={MESSAGES.REPLY_MODAL_DONE}
                variant="primary"
                onPress={onDone}
                style={styles.actionBtn}
              />
            </View>
          </ThemeProvider>
        </ModalSheet>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 0,
  },
  replyPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: tokens.radii.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.lg,
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  replyNativeText: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  copyIcon: {
    margin: 0,
    opacity: 0.85,
  },
  deleteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.space.sm,
    marginBottom: tokens.space.lg,
    gap: tokens.space.md,
  },
  deleteHint: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.space.md,
  },
  actionBtn: {
    minWidth: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});

export default ReplyModal;
