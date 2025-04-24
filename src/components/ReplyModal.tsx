import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Divider, Modal, Portal, Text} from 'react-native-paper';
import {theme} from '../theme/theme';

interface ReplyModalProps {
  visible: boolean;
  onDismiss: () => void;
  reply: string;
  onFinish: () => void;
  onCopy: () => void;
  onModifyResponse: () => void;
}

const ReplyModal: React.FC<ReplyModalProps> = ({
  visible,
  onDismiss,
  reply,
  onFinish,
  onCopy,
  onModifyResponse,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text variant="titleMedium">Generated Response</Text>
            <Button mode="text" onPress={onDismiss}>
              Close
            </Button>
          </View>

          <Text variant="bodyLarge" style={styles.replyText}>
            {reply}
          </Text>

          <View style={styles.messageSection}>
            <Text style={styles.returnMessage}>
              Return to your dating app to paste this response
            </Text>
            <Divider style={styles.divider} />
            <Text style={styles.modifyMessage}>
              Not quite what you're looking for? Try modifying the response.
            </Text>
          </View>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={onModifyResponse}
              style={styles.button}>
              Modify
            </Button>
            <Button mode="contained" onPress={onCopy} style={styles.button}>
              Copy
            </Button>
            <Button mode="contained" onPress={onFinish} style={styles.button}>
              Done
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    padding: 16,
  },
  modalContent: {
    padding: 16,
    borderRadius: theme.roundness,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  replyText: {
    marginBottom: 24,
    lineHeight: 24,
  },
  messageSection: {
    paddingVertical: 12,
  },
  returnMessage: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  divider: {
    backgroundColor: theme.colors.outline,
    marginVertical: 12,
  },
  modifyMessage: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ReplyModal;
