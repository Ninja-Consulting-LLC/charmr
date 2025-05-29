import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';

export const getFirestore = () => {
  try {
    const firestore = firebaseAdmin.firestore();
    logger.info('Firestore initialized successfully');
    return firestore;
  } catch (error) {
    logger.error('Failed to initialize Firestore', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
