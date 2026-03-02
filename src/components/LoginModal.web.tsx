import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  signInWithFacebookLimited,
  signInWithGoogle,
} from '../config/firebase';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onLoginSuccess,
}) => {
  const handleGoogle = async () => {
    await signInWithGoogle();
    onLoginSuccess?.();
  };

  const handleFacebook = async () => {
    await signInWithFacebookLimited();
    onLoginSuccess?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Preview Login</Text>
          <Text style={styles.description}>
            Native sign-in SDKs are mocked on web preview.
          </Text>
          <Pressable style={[styles.button, styles.primary]} onPress={handleGoogle}>
            <Text style={styles.primaryText}>Continue with Google (Preview)</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={handleFacebook}>
            <Text style={styles.secondaryText}>Continue with Facebook (Preview)</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.ghost]} onPress={onClose}>
            <Text style={styles.ghostText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7E22CE',
    textAlign: 'center',
  },
  description: {
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#40E0D0',
  },
  primaryText: {
    color: '#111',
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#ece9f5',
  },
  secondaryText: {
    color: '#3f2b5f',
    fontWeight: '600',
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#d8caed',
  },
  ghostText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
});

export default LoginModal;
