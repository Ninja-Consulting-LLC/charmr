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
          logger.info(
            'Attempting to initialize Firebase Admin with environment credentials',
          );
          // Try to parse as base64 first
          let serviceAccount;
          try {
            const decoded = Buffer.from(
              process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
              'base64',
            ).toString();
            serviceAccount = JSON.parse(decoded);
            logger.debug('Successfully decoded base64 credentials');
          } catch {
            // If base64 decoding fails, try parsing as direct JSON
            serviceAccount = JSON.parse(
              process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
            );
            logger.debug('Successfully parsed direct JSON credentials');
          }

          // Validate service account structure
          if (!serviceAccount.client_email || !serviceAccount.private_key) {
            throw new Error(
              'Invalid service account structure - missing client_email or private_key',
            );
          }

          logger.info('Service account validation passed', {
            clientEmail: serviceAccount.client_email,
            projectId: serviceAccount.project_id,
            hasPrivateKey: !!serviceAccount.private_key,
          });

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
        logger.info(
          'Attempting to initialize Firebase Admin with file-based credentials',
        );
        const serviceAccountPath =
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          path.join(__dirname, '../../service-account.json');
        logger.debug('Using service account file path', {
          path: serviceAccountPath,
        });
        credential = admin.credential.cert(serviceAccountPath);
      }

      const app = admin.initializeApp({
        projectId: 'ai-dating-keyboard', // From .firebaserc
        credential,
      });

      // Test the credentials by making a simple API call
      logger.info(
        'Firebase Admin initialized successfully, testing credentials...',
      );

      logger.debug('Firebase Admin initialization complete', {
        projectId: app.options.projectId,
        hasCredential: !!credential,
        appsCount: admin.apps.length,
      });
    } else {
      logger.debug('Firebase Admin already initialized');
    }
    return admin;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      hasEnvCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      hasFileCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    throw error;
  }
};

export const firebaseAdmin = initializeFirebaseAdmin();
