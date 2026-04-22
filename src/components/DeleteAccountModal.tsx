import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
} from '../design-system';

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
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={styles.card}>
            <AppText variant="titleSm" color="danger" style={styles.title}>
              Delete Account
            </AppText>

            <AppText variant="body" color="heroMuted" style={styles.description}>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </AppText>

            <AppText variant="bodyMedium" color="hero" style={styles.warning}>
              This will permanently remove your account and all associated data
              including:
            </AppText>

            <View style={styles.bulletPoints}>
              <AppText variant="body" color="heroMuted" style={styles.bulletPoint}>
                • All your matches and conversations
              </AppText>
              <AppText variant="body" color="heroMuted" style={styles.bulletPoint}>
                • Your subscription and payment history
              </AppText>
              <AppText variant="body" color="heroMuted" style={styles.bulletPoint}>
                • All your settings and preferences
              </AppText>
            </View>

            <AppText variant="caption" color="heroMuted" style={styles.note}>
              Note: You can restore your account by logging in with the same
              email address.
            </AppText>

            <View style={styles.buttonContainer}>
              <CharmrButton
                label="Cancel"
                variant="outline"
                onPress={onDismiss}
                disabled={isDeleting || isLoading}
                testID="delete-account-cancel-button"
                style={styles.btn}
              />
              <CharmrButton
                label="Delete Account"
                variant="danger"
                onPress={handleConfirm}
                disabled={isDeleting || isLoading}
                loading={isDeleting || isLoading}
                testID="delete-account-confirm-button"
                style={styles.btn}
              />
            </View>
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    textAlign: 'center',
  },
  warning: {
    marginTop: 8,
  },
  bulletPoints: {
    paddingLeft: 4,
    gap: 4,
  },
  bulletPoint: {},
  note: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    minWidth: 0,
  },
});

export default DeleteAccountModal;
