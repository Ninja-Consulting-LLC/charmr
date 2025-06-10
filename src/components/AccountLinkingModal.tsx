import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { signInWithGoogle } from '../config/firebase';
import { useStore } from '../store/StoreProvider';
import { theme } from '../theme/theme';
import { logger } from '../utils/logger';

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

  // Filter out methods that aren't Google or Facebook
  const filteredMethods = availableMethods.filter(
    method => method === 'google.com' || method === 'facebook.com',
  );

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
          <Text variant="headlineSmall" style={styles.title}>
            Account Already Exists
          </Text>

          <Text variant="bodyLarge" style={styles.message}>
            An account already exists with the email {email}. Please sign in
            with one of the following methods to link your account:
          </Text>

          <View style={styles.buttonContainer}>
            {filteredMethods.includes('google.com') && (
              <Button
                mode="contained"
                onPress={handleGoogleSignIn}
                style={styles.button}
                icon="google">
                Continue with Google
              </Button>
            )}

            {filteredMethods.includes('facebook.com') && (
              <Button
                mode="contained"
                onPress={() => {
                  // Facebook linking is handled in the parent component
                  onLinkSuccess?.();
                }}
                style={[styles.button, styles.facebookButton]}
                icon="facebook">
                Continue with Facebook
              </Button>
            )}
          </View>

          <Button mode="text" onPress={onDismiss} style={styles.cancelButton}>
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    marginVertical: 4,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default AccountLinkingModal;
