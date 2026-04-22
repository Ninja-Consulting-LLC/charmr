import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
import {signInWithGoogle} from '../config/firebase';
import {useStore} from '../store/StoreProvider';
import {logger} from '../utils/logger';

interface AccountLinkingModalProps {
  visible: boolean;
  onDismiss: () => void;
  onLinkSuccess?: () => void;
  availableMethods: string[];
  email: string;
}

const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  visible,
  onDismiss,
  onLinkSuccess,
  availableMethods,
  email,
}) => {
  const {handleProviderLogin} = useStore();

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await handleProviderLogin(userCredential.user);
      onLinkSuccess?.();
    } catch (error) {
      logger.auth.error('Google login error:', error);
    }
  };

  const filteredMethods = availableMethods.filter(
    method => method === 'google.com' || method === 'facebook.com',
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={styles.card}>
            <AppText variant="titleSm" color="hero" style={styles.title}>
              Account Already Exists
            </AppText>

            <AppText variant="body" color="heroMuted" style={styles.message}>
              An account already exists with the email {email}. Please sign in
              with one of the following methods to link your account:
            </AppText>

            <View style={styles.buttonContainer}>
              {filteredMethods.includes('google.com') && (
                <CharmrButton
                  label="Continue with Google"
                  variant="heroEmphasis"
                  fullWidth
                  onPress={handleGoogleSignIn}
                  style={styles.button}
                  leftIcon={
                    <Icon source="google" size={22} color={tokens.color.hero.text} />
                  }
                />
              )}

              {filteredMethods.includes('facebook.com') && (
                <CharmrButton
                  label="Continue with Facebook"
                  variant="outline"
                  fullWidth
                  onPress={() => {
                    onLinkSuccess?.();
                  }}
                  style={[styles.button, styles.facebookOutline]}
                  leftIcon={
                    <Icon source="facebook" size={22} color="#1877F2" />
                  }
                />
              )}
            </View>

            <CharmrButton
              label="Cancel"
              variant="ghost"
              onPress={onDismiss}
              fullWidth
            />
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: tokens.space.lg,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  buttonContainer: {
    gap: tokens.space.md,
  },
  button: {
    marginVertical: tokens.space.xxs,
  },
  facebookOutline: {
    borderColor: '#1877F2',
  },
});

export default AccountLinkingModal;
