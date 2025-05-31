import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  AppleAuthProvider,
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  updateProfile,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
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
      console.log('Sign in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('Play services not available');
    }
    console.error('Error in Google sign in:', error);
    throw error;
  }
};

export const signInWithApple = async () => {
  try {
    // Check if Apple Sign In is available on the device
    const isAvailable = await appleAuth.isSupported;
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device');
    }

    // Start the Apple sign-in flow
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // Note: According to the FAQ, FULL_NAME should come first in the array
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    // Ensure Apple returned a user identityToken
    if (!appleAuthResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identify token returned');
    }

    // Create a Firebase credential from the response
    const {identityToken, nonce} = appleAuthResponse;
    const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

    // Sign in with the credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, appleCredential);

    // If this is a new user, we might want to update their display name
    if (
      userCredential.additionalUserInfo?.isNewUser &&
      appleAuthResponse.fullName
    ) {
      const {givenName, familyName} = appleAuthResponse.fullName;
      const displayName = `${givenName || ''} ${familyName || ''}`.trim();
      if (displayName) {
        await updateProfile(userCredential.user, {displayName});
      }
    }

    return userCredential;
  } catch (error: any) {
    // Handle specific error cases
    if (
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/popup-closed-by-user'
    ) {
      throw new Error('Sign in was cancelled');
    }
    console.error('Apple Sign-In Error:', error);
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
