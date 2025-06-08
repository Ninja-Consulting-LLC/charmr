import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { theme } from '../theme/theme';

interface PurchaseSuccessModalProps {
  visible: boolean;
  onDismiss: () => void;
  showRegistrationPrompt?: boolean;
  onRegisterPress?: () => void;
}

const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  visible,
  onDismiss,
  showRegistrationPrompt,
  onRegisterPress,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View style={styles.content}>
          <Text
            variant="headlineMedium"
            style={[styles.successMessage, {color: theme.colors.primary}]}>
            🎉 Welcome to Pro!
          </Text>
          <Text variant="bodyLarge" style={styles.successSubMessage}>
            Your subscription is now active. Enjoy unlimited messages and all
            premium features.
          </Text>
          {showRegistrationPrompt && (
            <View style={styles.registrationPrompt}>
              <Text
                variant="bodyMedium"
                style={[styles.warningText, {color: theme.colors.error}]}>
                ⚠️ You are currently using the app anonymously. To ensure you
                don't lose your purchase, please register an account.
              </Text>
              <Button
                mode="contained"
                onPress={onRegisterPress}
                style={styles.registerButton}>
                Register Now
              </Button>
              <Button mode="text" onPress={onDismiss} style={styles.skipButton}>
                Skip for now
              </Button>
            </View>
          )}
          {!showRegistrationPrompt && (
            <Button mode="contained" onPress={onDismiss} style={styles.dismissButton}>
              Got it!
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: theme.roundness,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  successMessage: {
    textAlign: 'center',
  },
  successSubMessage: {
    textAlign: 'center',
  },
  registrationPrompt: {
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    textAlign: 'center',
  },
  registerButton: {
    marginTop: 8,
  },
  skipButton: {
    marginTop: 4,
  },
  dismissButton: {
    marginTop: 16,
  },
});

export default PurchaseSuccessModal;