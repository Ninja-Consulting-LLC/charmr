import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Surface, Text} from 'react-native-paper';
import {theme} from '../theme/theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  isLoading = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <Surface style={styles.surface}>
          <View style={styles.content}>
            <Text
              variant="headlineSmall"
              style={[styles.title, {color: theme.colors.error}]}>
              Delete Account
            </Text>

            <Text variant="bodyLarge" style={styles.description}>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </Text>

            <Text variant="bodyMedium" style={styles.warning}>
              ⚠️ This will permanently remove your account and all associated
              data including:
            </Text>

            <View style={styles.bulletPoints}>
              <Text variant="bodyMedium" style={styles.bulletPoint}>
                • All your matches and conversations
              </Text>
              <Text variant="bodyMedium" style={styles.bulletPoint}>
                • Your subscription and payment history
              </Text>
              <Text variant="bodyMedium" style={styles.bulletPoint}>
                • All your settings and preferences
              </Text>
            </View>

            <Text variant="bodyMedium" style={styles.note}>
              Note: You can restore your account by logging in with the same
              email address.
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.cancelButton}
                disabled={isDeleting || isLoading}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirm}
                style={[
                  styles.deleteButton,
                  {backgroundColor: theme.colors.error},
                ]}
                disabled={isDeleting || isLoading}
                loading={isDeleting || isLoading}>
                Delete Account
              </Button>
            </View>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 12,
  },
  surface: {
    borderRadius: 12,
    elevation: 5,
  },
  content: {
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  warning: {
    marginBottom: 12,
    fontWeight: '600',
  },
  bulletPoints: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  bulletPoint: {
    marginBottom: 4,
    lineHeight: 20,
  },
  note: {
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
});

export default DeleteAccountModal;
