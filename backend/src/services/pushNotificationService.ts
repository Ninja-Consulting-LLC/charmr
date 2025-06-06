import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) => {
  try {
    logger.info('Preparing to send push notification', {
      token: token.substring(0, 10) + '...', // Log only first 10 chars for security
      tokenLength: token.length,
      title,
      body,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high' as const,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    logger.info('Sending push notification to FCM', {
      messageId: 'pending',
      platform: token.startsWith('f') ? 'ios' : 'android', // FCM tokens for iOS start with 'f'
    });

    const response = await firebaseAdmin.messaging().send(message);

    logger.info('Successfully sent push notification', {
      messageId: response,
      token: token.substring(0, 10) + '...', // Log only first 10 chars for security
      tokenLength: token.length,
      title,
      body,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Failed to send push notification', {
      error: errorMessage,
      stack: errorStack,
      token: token.substring(0, 10) + '...', // Log only first 10 chars for security
      tokenLength: token.length,
      title,
      body,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    // Log specific error types
    if (errorMessage.includes('APNS')) {
      logger.error('APNS specific error', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
      });
    } else if (errorMessage.includes('FCM')) {
      logger.error('FCM specific error', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
      });
    }

    throw error;
  }
};
