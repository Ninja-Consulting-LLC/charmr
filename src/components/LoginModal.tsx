import { appleAuth } from '@invertase/react-native-apple-authentication';
import auth, {
  AppleAuthProvider,
  FacebookAuthProvider,
  getAuth
} from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signInWithFacebookLimited, signInWithGoogle } from '../config/firebase';
import { syncSubscriptionState } from '../services/revenueCatService';
import * as userService from '../services/userService';
import { updateUserProfile } from '../services/userService';
import { useStore } from '../store/StoreProvider';
import { theme } from '../theme/theme';
import { logger } from '../utils/logger';
import { getPlanLimits } from '../utils/planLimits';
import AccountLinkingModal from './AccountLinkingModal';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 280);

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  handleProviderLogin?: (firebaseUser: any) => Promise<void>;
}

const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onLoginSuccess,
  onLoadingChange,
  handleProviderLogin: propHandleProviderLogin,
}) => {
  const {handleProviderLogin: storeHandleProviderLogin, user, setUser} = useStore();
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingData, setLinkingData] = useState<{
    email: string;
    methods: string[];
    credential?: any;
    displayName?: string;
  } | null>(null);

  useEffect(() => {
    logger.auth.info('LoginModal mounted/updated:', {
      visible,
      hasHandleProviderLogin: !!propHandleProviderLogin,
      hasStoreHandleProviderLogin: !!storeHandleProviderLogin,
    });
  }, [visible, propHandleProviderLogin, storeHandleProviderLogin]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      onLoadingChange?.(true);
      logger.auth.info('Starting Google sign in process...');

      logger.auth.info('Attempting to sign in with Google...');
      const userCredential = await signInWithGoogle();
      logger.auth.info('Got Google user credential:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
      });

      // Call the appropriate handler
      if (propHandleProviderLogin) {
        logger.auth.info('Using provided handleProviderLogin handler');
        await propHandleProviderLogin(userCredential.user);
      } else if (storeHandleProviderLogin) {
        logger.auth.info('Using store handleProviderLogin handler');
        await storeHandleProviderLogin(userCredential.user);
      } else {
        logger.auth.error('No Google login handler available', {
          hasHandleProviderLogin: !!propHandleProviderLogin,
          hasStoreHandleProviderLogin: !!storeHandleProviderLogin,
        });
        throw new Error('No Google login handler available');
      }

      // After successful login, sync subscription state
      logger.auth.info('Syncing subscription state after login');
      await syncSubscriptionState(
        async (userId, plan) => {
          await userService.updateUserPlan(userId, plan);
          setUser({
            plan,
            getDailyMessageLimit: () => getPlanLimits(plan),
          });
        },
        setUser,
        user
      );

      logger.auth.info('Google sign in completed successfully');
      onLoginSuccess?.();
    } catch (error) {
      logger.auth.error('Google Sign-In Error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        hasHandleProviderLogin: !!propHandleProviderLogin,
        hasStoreHandleProviderLogin: !!storeHandleProviderLogin,
      });
      Alert.alert(
        'Sign In Failed',
        'There was an error signing in with Google. Please try again.',
      );
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const userCredential = await signInWithFacebookLimited();
      await (propHandleProviderLogin || storeHandleProviderLogin)(userCredential.user);
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

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      onLoadingChange?.(true);
      logger.auth.info('Starting Apple sign in process...');

      // Get Apple user credential
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      logger.auth.info('Apple Sign In Response:', {
        fullResponse: appleAuthResponse,
        identityToken: appleAuthResponse.identityToken ? 'present' : 'missing',
        nonce: appleAuthResponse.nonce ? 'present' : 'missing',
        fullName: appleAuthResponse.fullName,
        email: appleAuthResponse.email,
        realUserStatus: appleAuthResponse.realUserStatus,
        user: appleAuthResponse.user,
        authorizationCode: appleAuthResponse.authorizationCode ? 'present' : 'missing',
      });

      // Ensure Apple returned a user identityToken
      if (!appleAuthResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identify token returned');
      }

      // Get the full name from Apple response if available
      const fullName = appleAuthResponse.fullName;
      const displayName = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : null;

      // If we have an email from Apple, check if there's an existing account
      if (appleAuthResponse.email) {
        try {
          const auth = getAuth();
          logger.auth.info('Checking existing accounts for Apple email:', {
            appleEmail: appleAuthResponse.email,
            currentUserEmail: auth.currentUser?.email,
          });

          const signInMethods = await auth.fetchSignInMethodsForEmail(appleAuthResponse.email);
          logger.auth.info('Found sign in methods for Apple email:', {
            email: appleAuthResponse.email,
            methods: signInMethods,
          });

          // If there are existing sign-in methods and they don't include apple.com,
          // show the account linking modal
          if (signInMethods.length > 0 && !signInMethods.includes('apple.com')) {
            logger.auth.info('Found existing account with different provider', {
              email: appleAuthResponse.email,
              methods: signInMethods,
            });

            // Store the Apple credential for later use
            const { identityToken, nonce } = appleAuthResponse;
            const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

            setLinkingData({
              email: appleAuthResponse.email,
              methods: signInMethods,
              credential: appleCredential,
              displayName,
            });
            setShowAccountLinking(true);
            return;
          }
        } catch (error) {
          logger.auth.error('Error checking existing accounts:', error);
        }
      }

      // Create a Firebase credential from the response
      const { identityToken, nonce } = appleAuthResponse;
      const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

      // Sign in with credential
      const userCredential = await auth().signInWithCredential(appleCredential);

      // Update the user's display name if we got it from Apple
      if (displayName && displayName !== ' ') {
        await userCredential.user.updateProfile({ displayName });
        logger.auth.info('Updated user display name:', { displayName });
      }

      // If we have an email from Apple and it's different from the current email,
      // try to update it in the backend
      if (appleAuthResponse.email && appleAuthResponse.email !== userCredential.user.email) {
        try {
          // Update email in backend
          await updateUserProfile(userCredential.user.uid, {
            email: appleAuthResponse.email
          });
          logger.auth.info('Updated user email in backend:', {
            oldEmail: userCredential.user.email,
            newEmail: appleAuthResponse.email
          });
        } catch (error) {
          logger.auth.error('Failed to update user email in backend:', error);
        }
      }

      logger.auth.info('Got Apple user credential:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        appleFullName: displayName,
      });

      // Call the appropriate handler
      if (propHandleProviderLogin) {
        logger.auth.info('Using provided handleProviderLogin handler');
        await propHandleProviderLogin(userCredential.user);
      } else if (storeHandleProviderLogin) {
        logger.auth.info('Using store handleProviderLogin handler');
        await storeHandleProviderLogin(userCredential.user);
      } else {
        logger.auth.error('No login handler available');
        throw new Error('No login handler available');
      }

      // After successful login, sync subscription state
      logger.auth.info('Syncing subscription state after login');
      await syncSubscriptionState(
        async (userId, plan) => {
          await userService.updateUserPlan(userId, plan);
          setUser({
            plan,
            getDailyMessageLimit: () => getPlanLimits(plan),
          });
        },
        setUser,
        user
      );

      logger.auth.info('Apple sign in completed successfully');
      onLoginSuccess?.();
    } catch (error) {
      logger.auth.error('Apple Sign-In Error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert(
        'Sign In Failed',
        'There was an error signing in with Apple. Please try again.',
      );
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleLinkSuccess = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        logger.auth.error('No current user found for linking');
        return;
      }

      // If we have an Apple credential from the linking data, use it
      if (linkingData?.credential) {
        try {
          logger.auth.info('Linking Apple credential...');
          await currentUser.linkWithCredential(linkingData.credential);
          logger.auth.info('Successfully linked Apple credential');
        } catch (error) {
          logger.auth.error('Error linking Apple credential:', error);
          throw error;
        }
      }

      // Try to link Facebook credentials
      try {
        const facebookResult = await LoginManager.logInWithPermissions([
          'public_profile',
          'email',
        ]);

        if (facebookResult.isCancelled) {
          logger.auth.info('User cancelled Facebook login during linking');
          return;
        }

        const data = await AccessToken.getCurrentAccessToken();
        if (!data) {
          throw new Error('No Facebook access token available');
        }

        const facebookCredential = FacebookAuthProvider.credential(
          data.accessToken,
        );

        await currentUser.linkWithCredential(facebookCredential);
        logger.auth.info('Successfully linked Facebook credential');
      } catch (error) {
        logger.auth.error('Error linking Facebook credentials:', error);
      }

      setShowAccountLinking(false);
      setLinkingData(null);
      onLoginSuccess?.();
    } catch (error) {
      logger.auth.error('Error in handleLinkSuccess:', error);
      Alert.alert(
        'Account Linking Failed',
        'There was an error linking your accounts. Please try again.',
      );
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

                  <TouchableOpacity
                    style={[styles.button, styles.appleButton]}
                    onPress={handleAppleLogin}
                    testID="apple-login-button">
                    <View style={styles.buttonContent}>
                      <Icon
                        name="apple"
                        size={20}
                        color={theme.colors.surface}
                      />
                      <Text style={styles.appleButtonText}>
                        Continue with Apple
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
    minHeight: 300,
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
    backgroundColor: '#000000',
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
