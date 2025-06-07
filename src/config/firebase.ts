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
import {sha256} from 'react-native-sha256';
import {logger} from '../utils/logger';

export const signInWithGoogle = async () => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

    // Sign in and get response
    const signInResult = await GoogleSignin.signIn();
    console.log('User info after Google sign in:', signInResult);

    // Get tokens
    const idToken = signInResult.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token present in tokens response');
    }

    // Create Google credential with ID token
    const googleCredential = GoogleAuthProvider.credential(idToken);
    console.log('Created Google credential');

    // Sign in to Firebase with credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('Successfully signed in to Firebase');
    return userCredential;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled the sign in flow');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('Play services not available');
    }
    console.error('Error in Google sign in:', error);
    throw error;
  }
};

export const signInWithFacebook = async () => {
  try {
    console.log('Starting Facebook login process...');
    logger.app.info('Starting Facebook login process');

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
      console.log('User cancelled the login process');
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
    console.error('Facebook login error:', error);
    throw error;
  }
};

export const signInWithFacebookLimited = async () => {
  try {
    console.log('Starting Facebook limited login process...');
    logger.app.info('Starting Facebook limited login process');

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
    console.log('Facebook limited login result:', result);
    logger.app.info('Facebook limited login result', {result});

    if (result.isCancelled) {
      console.log('User cancelled the limited login process');
      logger.app.info('User cancelled the limited login process');
      throw new Error('User cancelled the limited login process');
    }

    // Once signed in, get the users AuthenticationToken
    const data = await AuthenticationToken.getAuthenticationTokenIOS();
    console.log('Facebook limited authentication token data:', data);
    logger.app.info('Facebook limited authentication token data', {data});

    if (!data) {
      console.log('Something went wrong obtaining authentication token');
      logger.app.error('Something went wrong obtaining authentication token');
      throw new Error('Something went wrong obtaining authentication token');
    }

    // Create a Firebase credential with the AuthenticationToken and nonce
    const facebookCredential = FacebookAuthProvider.credential(
      data.authenticationToken,
      nonce,
    );
    console.log('Created Facebook limited credential');
    logger.app.info('Created Facebook limited credential');

    // Sign-in the user with the credential
    const auth = getAuth();
    try {
      const userCredential = await signInWithCredential(
        auth,
        facebookCredential,
      );
      console.log('Successfully signed in with Facebook limited login');
      logger.app.info('Successfully signed in with Facebook limited login', {
        user: userCredential.user,
      });
      return userCredential;
    } catch (error: any) {
      // Check if the error is about an existing account with different credentials
      if (error.code === 'auth/account-exists-with-different-credential') {
        console.log(
          'Account exists with different credentials, attempting to link...',
        );
        logger.app.info(
          'Account exists with different credentials, attempting to link',
        );

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
        console.log('Available sign-in methods:', signInMethods);
        logger.app.info('Available sign-in methods', {signInMethods});

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
        console.log('Throwing special error object:', errorObj);
        logger.app.info('Throwing special error object', {errorObj});
        throw errorObj;
      }
      throw error;
    }
  } catch (error) {
    console.error('Facebook limited sign in error:', error);
    logger.app.error('Facebook limited sign in error', {error});
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
      logger.app.info('Successfully signed out user');
    } else {
      logger.app.info('No user currently signed in, skipping sign out');
    }
  } catch (error) {
    // If the error is about no current user, we can ignore it
    if (error instanceof Error && error.message.includes('no-current-user')) {
      logger.app.info('No user currently signed in, skipping sign out');
      return;
    }
    logger.app.error('Sign Out Error:', error);
    throw error;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    logger.app.debug('No authenticated user found');
    return null;
  }
  return user.getIdToken();
};
