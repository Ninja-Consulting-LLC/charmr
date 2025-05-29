import * as admin from 'firebase-admin';
import logger from '../utils/logger';

// Initialize Firebase Admin using the existing project configuration
const initializeFirebaseAdmin = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'ai-dating-keyboard', // From .firebaserc
        // The credentials will be automatically picked up from GOOGLE_APPLICATION_CREDENTIALS
        // environment variable or from the default service account in production
      });
      logger.info('Firebase Admin initialized successfully');
    }
    return admin;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const firebaseAdmin = initializeFirebaseAdmin();
