import * as admin from 'firebase-admin';
import * as path from 'path';
import logger from '../utils/logger';

// Initialize Firebase Admin using the existing project configuration
const initializeFirebaseAdmin = () => {
  try {
    if (!admin.apps.length) {
      const serviceAccountPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../../service-account.json');
      admin.initializeApp({
        projectId: 'ai-dating-keyboard', // From .firebaserc
        credential: admin.credential.cert(serviceAccountPath),
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
