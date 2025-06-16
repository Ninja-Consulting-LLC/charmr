import * as admin from 'firebase-admin';
import * as path from 'path';
import logger from '../utils/logger';

// Initialize Firebase Admin using the existing project configuration
const initializeFirebaseAdmin = () => {
  try {
    if (!admin.apps.length) {
      let credential;

      // First try to get credentials from environment variable
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          // Try to parse as base64 first
          let serviceAccount;
          try {
            const decoded = Buffer.from(
              process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
              'base64',
            ).toString();
            serviceAccount = JSON.parse(decoded);
          } catch {
            // If base64 decoding fails, try parsing as direct JSON
            serviceAccount = JSON.parse(
              process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
            );
          }
          credential = admin.credential.cert(serviceAccount);
        } catch (error) {
          logger.error(
            'Failed to parse service account JSON from environment variable',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
          throw error;
        }
      } else {
        // Fall back to file-based credentials
        const serviceAccountPath =
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          path.join(__dirname, '../../service-account.json');
        credential = admin.credential.cert(serviceAccountPath);
      }

      admin.initializeApp({
        projectId: 'ai-dating-keyboard', // From .firebaserc
        credential,
      });
      logger.debug('Firebase Admin initialized successfully');
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
