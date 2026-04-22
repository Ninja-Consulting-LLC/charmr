import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';

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
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={styles.card}>
            <AppText variant="title" color="hero" style={styles.successMessage}>
              Welcome to Pro!
            </AppText>
            <AppText variant="body" color="heroMuted" style={styles.successSubMessage}>
              You are on Pro now. You get unlimited messages and the full premium
              set.
            </AppText>
            {showRegistrationPrompt && (
              <View style={styles.registrationPrompt}>
                <AppText variant="bodyMedium" color="danger" style={styles.warningText}>
                  You are using the app without an account. Create one so your
                  purchase stays linked if you switch phones.
                </AppText>
                <CharmrButton
                  label="Create account"
                  variant="primary"
                  onPress={onRegisterPress}
                  fullWidth
                />
                <CharmrButton
                  label="Skip for now"
                  variant="ghost"
                  onPress={onDismiss}
                  fullWidth
                />
              </View>
            )}
            {!showRegistrationPrompt && (
              <CharmrButton
                label="Got it"
                variant="primary"
                onPress={onDismiss}
                fullWidth
              />
            )}
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: tokens.space.md,
  },
  successMessage: {
    textAlign: 'center',
  },
  successSubMessage: {
    textAlign: 'center',
  },
  registrationPrompt: {
    gap: tokens.space.sm,
    marginTop: tokens.space.xs,
  },
  warningText: {
    textAlign: 'center',
  },
});

export default PurchaseSuccessModal;
