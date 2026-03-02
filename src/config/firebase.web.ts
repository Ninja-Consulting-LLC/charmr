import {logger} from '../utils/logger';

const warned = new Set<string>();

const warnOnce = (key: string, message: string) => {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(message);
  logger.auth.warn(message);
};

const createPreviewUserCredential = (providerId: string) => ({
  user: {
    uid: 'web-preview-user',
    email: 'preview@charmr.local',
    displayName: 'Web Preview User',
    providerId,
    isAnonymous: false,
    getIdToken: async () => null,
  },
});

export const signInWithGoogle = async () => {
  warnOnce(
    'google_signin_web_preview',
    '[web-preview] Google Sign-In native SDK is unavailable in browser preview. Using a mock credential.',
  );
  return createPreviewUserCredential('google.com');
};

export const signInWithFacebook = async () => {
  warnOnce(
    'facebook_signin_web_preview',
    '[web-preview] Facebook native SDK is unavailable in browser preview. Using a mock credential.',
  );
  return createPreviewUserCredential('facebook.com');
};

export const signInWithFacebookLimited = async () => {
  warnOnce(
    'facebook_limited_signin_web_preview',
    '[web-preview] Facebook Limited Login is unavailable in browser preview. Using a mock credential.',
  );
  return createPreviewUserCredential('facebook.com');
};

export const signOut = async () => {
  warnOnce(
    'signout_web_preview',
    '[web-preview] Firebase mobile sign-out is not active on web preview. Clearing local state only.',
  );
};

export const getAuthToken = async (): Promise<string | null> => {
  return null;
};
