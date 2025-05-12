import {useNavigation} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {Linking} from 'react-native';
import {useImagePicker} from '../hooks/useImagePicker';
import {useStore} from '../store';
import {logger} from '../utils/logger';

export const DeepLinkHandler: React.FC = () => {
  const {user} = useStore();
  const navigation = useNavigation();
  const {pickImages} = useImagePicker();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      logger.deepLink.info('🔍 Deep Link Analysis:');
      logger.deepLink.info('  - Full URL: ' + url);
      logger.deepLink.info(
        '  - URL includes /homescreen: ' +
          url.includes('charmr://open/homescreen'),
      );
      logger.deepLink.info(
        '  - URL includes /screenshot: ' +
          url.includes('charmr://open/screenshot'),
      );

      if (url.includes('charmr://open/homescreen')) {
        logger.deepLink.info('📱 Navigating to Home screen');
        navigation.navigate('Home' as never);
      } else if (url.includes('charmr://open/screenshot')) {
        logger.deepLink.info('📸 Opening screenshot upload flow:');
        logger.deepLink.info('  1. Navigating to Home screen');
        navigation.navigate('Home' as never);

        logger.deepLink.info('  2. Waiting for navigation to complete...');
        setTimeout(async () => {
          try {
            logger.deepLink.info('  3. Attempting to open image picker...');
            await pickImages();
            logger.deepLink.info('  ✅ Image picker opened successfully');
          } catch (error) {
            logger.deepLink.error('  ❌ Error opening image picker:', error);
          }
        }, 500);
      } else {
        logger.deepLink.info('⚠️ Unhandled deep link URL pattern');
      }
    };

    logger.deepLink.info('🔄 Setting up deep link handlers...');

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({url}) => {
      logger.deepLink.info(
        '📨 Received deep link event while app running: ' + url,
      );
      handleDeepLink(url);
    });

    // Check for initial deep link that launched the app
    Linking.getInitialURL().then(url => {
      logger.deepLink.info('🚀 Checking initial deep link URL: ' + url);
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      logger.deepLink.info('♻️ Cleaning up deep link handlers');
      subscription.remove();
    };
  }, [navigation, user, pickImages]);

  return null;
};
