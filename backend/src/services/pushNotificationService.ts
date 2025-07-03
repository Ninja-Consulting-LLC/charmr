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
        ttl: 60 * 60 * 1000, // 1 hour TTL
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'mutable-content': 1,
            'content-available': 1,
            alert: {
              title,
              body,
            },
            'thread-id': data?.type || 'default', // Group notifications by type
          },
        },
        headers: {
          'apns-priority': '10', // High priority
          'apns-expiration': Math.floor(Date.now() / 1000 + 3600).toString(), // 1 hour expiration
          'apns-push-type': 'alert', // Explicitly set push type
          'apns-topic': 'com.charmr.app', // Your app's bundle ID
        },
      },
    };

    logger.info('Sending push notification to FCM', {
      messageId: 'pending',
      platform: token.startsWith('f') ? 'ios' : 'android', // FCM tokens for iOS start with 'f'
      priority: 'high',
      ttl: '1 hour',
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
      deliveryStatus: 'sent',
    });

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check for specific FCM error types
    if (errorMessage.includes('messaging/quota-exceeded')) {
      logger.error('FCM quota exceeded - throttling in effect', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        recommendation: 'Consider implementing exponential backoff',
      });
    } else if (errorMessage.includes('messaging/invalid-registration-token')) {
      logger.error('Invalid FCM registration token', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        recommendation: 'Remove this token from the database',
      });
    } else if (
      errorMessage.includes('messaging/registration-token-not-registered')
    ) {
      logger.error('FCM token no longer registered', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        recommendation: 'Remove this token from the database',
      });
    } else if (
      errorMessage.includes('messaging/device-message-rate-exceeded')
    ) {
      logger.error('FCM device message rate exceeded', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        recommendation: 'Implement rate limiting per device',
      });
    } else if (
      errorMessage.includes('APNS') ||
      errorMessage.includes('Auth error from APNS')
    ) {
      logger.error('APNS authentication error - check Firebase credentials', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        platform: token.startsWith('f') ? 'ios' : 'android',
        recommendation:
          'Check Firebase service account key and project configuration',
        troubleshooting: [
          'Verify service account key is valid and not expired',
          'Check if Firebase project is active',
          'Ensure Cloud Messaging is enabled in Firebase Console',
          'Verify service account has Firebase Admin and Cloud Messaging Admin roles',
        ],
      });
    } else if (
      errorMessage.includes('Auth error from APNS or Web Push Service')
    ) {
      logger.error('Firebase authentication error - service account issue', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        platform: token.startsWith('f') ? 'ios' : 'android',
        recommendation: 'Regenerate Firebase service account key',
        troubleshooting: [
          'Go to Firebase Console → Project Settings → Service Accounts',
          'Generate new private key',
          'Update GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable',
          'Restart the application',
        ],
      });
    } else {
      logger.error('Failed to send push notification', {
        error: errorMessage,
        stack: errorStack,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        title,
        body,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        platform: token.startsWith('f') ? 'ios' : 'android',
      });
    }

    throw error;
  }
};
