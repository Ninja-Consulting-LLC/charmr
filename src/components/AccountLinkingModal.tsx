import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Text} from 'react-native-paper';
import {signInWithApple, signInWithGoogle} from '../config/firebase';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';

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
  const {handleGoogleLogin} = useStore();

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await handleGoogleLogin(userCredential.user);
      onLinkSuccess?.();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
      onLinkSuccess?.();
    } catch (error) {
      console.error('Apple login error:', error);
    }
  };

  const getProviderName = (method: string) => {
    switch (method) {
      case 'google.com':
        return 'Google';
      case 'apple.com':
        return 'Apple';
      case 'password':
        return 'Email/Password';
      default:
        return method;
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
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Account Already Exists
          </Text>

          <Text variant="bodyLarge" style={styles.message}>
            An account already exists with the email {email}. Please sign in
            with one of the following methods to link your Facebook account:
          </Text>

          <View style={styles.buttonContainer}>
            {availableMethods.includes('google.com') && (
              <Button
                mode="contained"
                onPress={handleGoogleSignIn}
                style={styles.button}
                icon="google">
                Continue with Google
              </Button>
            )}

            {availableMethods.includes('apple.com') && (
              <Button
                mode="contained"
                onPress={handleAppleLogin}
                style={styles.button}
                icon="apple">
                Continue with Apple
              </Button>
            )}

            {availableMethods.includes('password') && (
              <Button
                mode="contained"
                onPress={() => {
                  // TODO: Implement email/password sign in
                  console.log('Email/password sign in not implemented yet');
                }}
                style={styles.button}
                icon="email">
                Sign in with Email
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
  cancelButton: {
    marginTop: 8,
  },
});

export default AccountLinkingModal;
