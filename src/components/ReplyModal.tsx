import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
  IconButton,
  Modal,
  Portal,
  Switch,
  Text,
  Tooltip,
} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {theme} from '../theme/theme';

interface ReplyModalProps {
  visible: boolean;
  onDismiss: () => void;
  reply: string;
  onDone: () => void;
  onCopy: () => void;
  onModifyResponse: () => void;
  onDeleteScreenshots: (value: boolean) => void;
  deleteScreenshots: boolean;
}

const ReplyModal: React.FC<ReplyModalProps> = ({
  visible,
  onDismiss,
  reply,
  onDone,
  onCopy,
  onModifyResponse,
  onDeleteScreenshots,
  deleteScreenshots,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              {MESSAGES.REPLY_MODAL_TITLE}
            </Text>
            <IconButton
              icon="close"
              onPress={onDismiss}
              size={24}
              testID="close-button"
            />
          </View>

          {/* Reply Text */}
          <Pressable onPress={onCopy} style={styles.replyContainer}>
            <Text variant="bodyLarge" style={styles.replyText}>
              {reply}
            </Text>
            <IconButton
              icon="content-copy"
              size={20}
              style={styles.copyIcon}
              onPress={onCopy}
            />
          </Pressable>

          {/* Delete Switch */}
          <View style={styles.deleteSection}>
            <Text variant="bodyMedium">{MESSAGES.REPLY_MODAL_DELETE_HINT}</Text>
            <Switch
              value={deleteScreenshots}
              onValueChange={onDeleteScreenshots}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <View style={styles.modifySection}>
              <Tooltip
                title={MESSAGES.REPLY_MODAL_MODIFY_HINT}
                enterTouchDelay={50}
                leaveTouchDelay={1000}
                theme={{
                  colors: {
                    onSurface: theme.colors.inverseOnSurface,
                    surface: theme.colors.inverseSurface,
                  },
                  fonts: {
                    bodyMedium: {
                      ...theme.fonts.bodyMedium,
                      lineHeight: 24,
                    },
                  },
                  roundness: 8,
                }}>
                <IconButton
                  icon="information"
                  size={20}
                  style={styles.infoIcon}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </Tooltip>
              <Pressable onPress={onModifyResponse} style={styles.modifyButton}>
                <Text variant="bodyMedium" style={styles.modifyText}>
                  {MESSAGES.REPLY_MODAL_MODIFY}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={onDone} style={styles.doneButton}>
              <Text variant="bodyMedium" style={styles.doneText}>
                {MESSAGES.REPLY_MODAL_DONE}
              </Text>
            </Pressable>
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
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: theme.colors.onSurface,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  replyText: {
    flex: 1,
    marginRight: 8,
  },
  copyIcon: {
    margin: 0,
    opacity: 0.6,
  },
  helperText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
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
  modifySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modifyButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modifyText: {
    color: theme.colors.onSurfaceVariant,
  },
  infoIcon: {
    margin: 0,
    marginRight: 4,
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
  tooltipText: {
    color: theme.colors.inverseOnSurface,
    fontSize: 14,
  },
});

export default ReplyModal;
