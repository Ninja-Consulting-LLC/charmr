import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {signInWithApple, signInWithGoogle} from '../config/firebase';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 280);

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
  const {handleGoogleLogin} = useStore();

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await handleGoogleLogin(userCredential.user);
      onLoginSuccess?.();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
      onLoginSuccess?.();
    } catch (error) {
      console.error('Apple login error:', error);
    }
  };

  const handleFacebookLogin = () => {
    // Placeholder for Facebook login
    console.log('Facebook login clicked');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryContainer]}
            style={styles.modalContent}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.googleButton]}
                onPress={handleGoogleSignIn}
                testID="google-login-button">
                <View style={styles.buttonContent}>
                  <Icon
                    name="google"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.appleButton]}
                onPress={handleAppleLogin}>
                <View style={styles.buttonContent}>
                  <Icon name="apple" size={20} color={theme.colors.surface} />
                  <Text style={styles.appleButtonText}>
                    Continue with Apple
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.facebookButton]}
                onPress={() => {}}>
                <View style={styles.buttonContent}>
                  <Icon
                    name="facebook"
                    size={20}
                    color={theme.colors.surface}
                  />
                  <Text style={styles.facebookButtonText}>
                    Continue with Facebook
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: MODAL_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    width: '100%',
    minHeight: 280,
    paddingTop: 24,
    borderRadius: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  button: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: theme.colors.secondary,
  },
  appleButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  googleButtonText: {
    color: theme.colors.onSurface,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  appleButtonText: {
    color: theme.colors.surface,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  facebookButtonText: {
    color: theme.colors.surface,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginModal;
