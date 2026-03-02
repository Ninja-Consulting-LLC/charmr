import {
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
} from 'react-native-fbsdk-next';
import { sha256 } from 'react-native-sha256';
import { logger } from '../utils/logger';

export const signInWithGoogle = async () => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

    // Sign in and get response
    const signInResult = await GoogleSignin.signIn();
    logger.auth.info('User info after Google sign in:', signInResult);

    // Get tokens
    const idToken = signInResult.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token present in tokens response');
    }

    // Create Google credential with ID token
    const googleCredential = GoogleAuthProvider.credential(idToken);
    logger.auth.info('Created Google credential');

    // Sign in to Firebase with credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);
    logger.auth.info('Successfully signed in to Firebase');
    return userCredential;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      logger.auth.info('User cancelled the sign in flow');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      logger.auth.info('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      logger.auth.info('Play services not available');
    }
    logger.auth.error('Error in Google sign in:', error);
    throw error;
  }
};

export const signInWithFacebook = async () => {
  try {
    logger.auth.info('Starting Facebook login process...');

    // Initialize Facebook SDK if not already initialized
    if (!LoginManager) {
      throw new Error('Facebook SDK not properly initialized');
    }

    // Attempt login with permissions
    const result = await LoginManager.logInWithPermissions([
      'public_profile',
      'email',
    ]);

    if (result.isCancelled) {
      logger.auth.info('User cancelled the login process');
      throw new Error('User cancelled the login process');
    }

    // Get access token
    const data = await AccessToken.getCurrentAccessToken();
    if (!data) {
      throw new Error('No Facebook access token available');
    }

    // Create a Firebase credential with the access token
    const facebookCredential = FacebookAuthProvider.credential(
      data.accessToken,
    );

    // Sign in with the credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, facebookCredential);

    return userCredential;
  } catch (error) {
    logger.auth.error('Facebook login error:', error);
    throw error;
  }
};

export const signInWithFacebookLimited = async () => {
  try {
    logger.auth.info('Starting Facebook limited login process');

    // Generate a random nonce for each login attempt
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const nonceSha256 = await sha256(nonce);

    // Attempt login with permissions and limited login
    const result = await LoginManager.logInWithPermissions(
      ['public_profile', 'email'],
      'limited',
      nonceSha256,
    );
    logger.auth.info('Facebook limited login result', {result});

    if (result.isCancelled) {
      logger.auth.info('User cancelled the limited login process');
      throw new Error('User cancelled the limited login process');
    }

    // Once signed in, get the users AuthenticationToken
    const data = await AuthenticationToken.getAuthenticationTokenIOS();
    logger.auth.info('Facebook limited authentication token data', {data});

    if (!data) {
      logger.auth.error('Something went wrong obtaining authentication token');
      throw new Error('Something went wrong obtaining authentication token');
    }

    // Create a Firebase credential with the AuthenticationToken and nonce
    const facebookCredential = FacebookAuthProvider.credential(
      data.authenticationToken,
      nonce,
    );
    logger.auth.info('Created Facebook limited credential');

    // Sign-in the user with the credential
    const auth = getAuth();
    try {
      const userCredential = await signInWithCredential(
        auth,
        facebookCredential,
      );
      logger.auth.info('Successfully signed in with Facebook limited login', {
        user: userCredential.user,
      });
      return userCredential;
    } catch (error: any) {
      // Check if the error is about an existing account with different credentials
      if (error.code === 'auth/account-exists-with-different-credential') {
        logger.auth.info('Account exists with different credentials, attempting to link');

        // Decode the JWT token to get the email
        const tokenParts = data.authenticationToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid authentication token format');
        }

        const payload = JSON.parse(atob(tokenParts[1]));
        const email = payload.email;

        if (!email) {
          throw new Error('No email found in Facebook token data');
        }

        // Get the list of sign-in methods for the email
        const signInMethods = await auth.fetchSignInMethodsForEmail(email);
        logger.auth.info('Available sign-in methods', {signInMethods});

        // Always throw the special error object with sign-in methods
        const errorObj = {
          code: 'auth/account-exists-with-different-credential',
          message: `An account already exists with this email. Please sign in with ${
            signInMethods.length > 0
              ? signInMethods.join(' or ')
              : 'your existing account'
          } first, then try linking your Facebook account.`,
          signInMethods:
            signInMethods.length > 0
              ? signInMethods
              : ['google.com', 'apple.com', 'password'],
          email,
        };
        throw errorObj;
      }
      throw error;
    }
  } catch (error) {
    logger.auth.error('Facebook login error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    // Only attempt to sign out if there's a current user
    if (user) {
      await auth.signOut();
      await GoogleSignin.signOut();
      logger.auth.info('Successfully signed out user');
    } else {
      logger.auth.info('No user currently signed in, skipping sign out');
    }
  } catch (error) {
    // If the error is about no current user, we can ignore it
    if (error instanceof Error && error.message.includes('no-current-user')) {
      logger.auth.info('No user currently signed in, skipping sign out');
      return;
    }
    logger.auth.error('Sign Out Error:', error);
    throw error;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    logger.auth.debug('No authenticated user found');
    return null;
  }
  return user.getIdToken();
};
