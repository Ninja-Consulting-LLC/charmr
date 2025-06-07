import auth, {
  FacebookAuthProvider,
  GoogleAuthProvider,
} from '@react-native-firebase/auth';
import React, {useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {AccessToken, LoginManager} from 'react-native-fbsdk-next';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {signInWithFacebookLimited, signInWithGoogle} from '../config/firebase';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';
import AccountLinkingModal from './AccountLinkingModal';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 280);

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onLoginSuccess,
  onLoadingChange,
}) => {
  const {handleGoogleLogin} = useStore();
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingData, setLinkingData] = useState<{
    email: string;
    methods: string[];
  } | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      onLoadingChange?.(true);
      console.log('Starting Google sign in process...');
      const userCredential = await signInWithGoogle();
      console.log('Got Google user credential:', userCredential.user.uid);

      // If we're in account linking mode, link the accounts
      if (showAccountLinking) {
        console.log('In account linking mode, starting linking process...');
        const currentUser = auth().currentUser;
        if (!currentUser) {
          console.error('No current user found for linking');
          throw new Error('No current user found for linking');
        }

        // Create a new Google credential
        const googleCredential = GoogleAuthProvider.credential(
          userCredential.user.getIdToken(),
        );
        console.log('Created Google credential for linking');

        // Link the Google credential to the current user
        await currentUser.linkWithCredential(googleCredential);
        console.log('Successfully linked Google credential');

        // Now try to link Facebook credentials
        try {
          console.log('Starting Facebook credential linking...');
          const facebookResult = await LoginManager.logInWithPermissions([
            'public_profile',
            'email',
          ]);

          if (facebookResult.isCancelled) {
            console.log('User cancelled Facebook login during linking');
            return;
          }

          const data = await AccessToken.getCurrentAccessToken();
          if (!data) {
            throw new Error('No Facebook access token available');
          }

          console.log('Got Facebook access token, creating credential...');
          const facebookCredential = FacebookAuthProvider.credential(
            data.accessToken,
          );

          await currentUser.linkWithCredential(facebookCredential);
          console.log('Successfully linked Facebook credential');
        } catch (error) {
          console.error('Error linking Facebook credentials:', error);
        }

        await handleGoogleLogin(userCredential.user);
        handleLinkSuccess();
      } else {
        // Normal sign in flow
        await handleGoogleLogin(userCredential.user);
        onLoginSuccess?.();
      }
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const userCredential = await signInWithFacebookLimited();
      await handleGoogleLogin(userCredential.user);
      onLoginSuccess?.();
    } catch (error: any) {
      console.log('Facebook login error details:', {
        code: error.code,
        message: error.message,
        email: error.email,
        signInMethods: error.signInMethods,
      });

      if (error.code === 'auth/account-exists-with-different-credential') {
        // Extract email and sign-in methods from the error
        const email = error.email || 'your email';
        const methods = error.signInMethods || [
          'google.com',
          'apple.com',
          'password',
        ];

        console.log('Setting linking data:', {email, methods});
        setLinkingData({email, methods});
        setShowAccountLinking(true);
        return;
      }
      console.error('Facebook login error:', error);
    }
  };

  const handleLinkSuccess = async () => {
    try {
      console.log('Starting account linking process...');
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.error('No current user found for linking');
        return;
      }

      // Try to link Facebook credentials
      try {
        console.log('Starting Facebook credential linking...');
        const facebookResult = await LoginManager.logInWithPermissions([
          'public_profile',
          'email',
        ]);

        if (facebookResult.isCancelled) {
          console.log('User cancelled Facebook login during linking');
          return;
        }

        const data = await AccessToken.getCurrentAccessToken();
        if (!data) {
          throw new Error('No Facebook access token available');
        }

        console.log('Got Facebook access token, creating credential...');
        const facebookCredential = FacebookAuthProvider.credential(
          data.accessToken,
        );

        await currentUser.linkWithCredential(facebookCredential);
        console.log('Successfully linked Facebook credential');
      } catch (error) {
        console.error('Error linking Facebook credentials:', error);
      }

      setShowAccountLinking(false);
      setLinkingData(null);
      onLoginSuccess?.();
    } catch (error) {
      console.error('Error in handleLinkSuccess:', error);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showAccountLinking}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.surface} />
              <Text style={styles.loadingText}>Signing in...</Text>
            </View>
          ) : (
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
                    style={[styles.button, styles.facebookButton]}
                    onPress={handleFacebookLogin}
                    testID="facebook-login-button">
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
          )}
        </View>
      </Modal>

      {linkingData && (
        <AccountLinkingModal
          visible={showAccountLinking}
          onDismiss={() => {
            setShowAccountLinking(false);
            setLinkingData(null);
          }}
          onLinkSuccess={handleLinkSuccess}
          availableMethods={linkingData.methods}
          email={linkingData.email}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.surface,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modalWrapper: {
    width: MODAL_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    width: '100%',
    minHeight: 240,
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginModal;
