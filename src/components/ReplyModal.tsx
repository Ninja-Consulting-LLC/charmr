import Clipboard from '@react-native-clipboard/clipboard';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Button,
  Divider,
  IconButton,
  Modal,
  Surface,
  Text,
} from 'react-native-paper';

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
  const handleCopyToClipboard = () => {
    Clipboard.setString(reply);
    onCopy();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      testID="modal"
      contentContainerStyle={styles.modalContainer}>
      <Surface style={styles.modalContent}>
        <View style={styles.header}>
          <Text variant="titleMedium">Generated Reply</Text>
          <IconButton
            testID="copy-button"
            icon="content-copy"
            onPress={handleCopyToClipboard}
          />
        </View>
        <Text style={styles.replyText}>{reply}</Text>
        <View style={styles.messageSection}>
          <Text style={styles.returnMessage}>
            Return to your dating app to paste the message
          </Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.messageSection}>
          <Text style={styles.modifyMessage}>
            Not happy with this response?{'\n'}Modify your prompt to generate a
            new one
          </Text>
        </View>
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={onModifyResponse}
            testID="modify-button"
            style={styles.button}>
            Modify Response
          </Button>
          <Button
            mode="outlined"
            onPress={onFinish}
            testID="finish-button"
            style={styles.button}>
            Finish
          </Button>
        </View>
      </Surface>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    padding: 16,
  },
  modalContent: {
    padding: 16,
    borderRadius: 8,
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
    color: '#666',
    fontStyle: 'italic',
  },
  divider: {
    backgroundColor: '#e0e0e0',
  },
  modifyMessage: {
    textAlign: 'center',
    color: '#666',
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
