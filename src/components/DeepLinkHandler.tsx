import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useRef} from 'react';
import {Linking} from 'react-native';
import {useImagePicker} from '../hooks/useImagePicker';
import {useStore} from '../store/StoreProvider';
import {logger} from '../utils/logger';

export const DeepLinkHandler: React.FC = () => {
  const {user} = useStore();
  const navigation = useNavigation();
  const {pickImages} = useImagePicker();
  const subscriptionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const handleDeepLink = async (url: string) => {
      let actionTaken = 'none';
      let errorMessage = null;
      try {
        if (url.includes('charmr://open/homescreen')) {
          actionTaken = 'navigate_home';
          navigation.navigate('Home' as never);
        } else if (url.includes('charmr://open/screenshot')) {
          actionTaken = 'navigate_home_and_open_image_picker';
          navigation.navigate('Home' as never);
          setTimeout(async () => {
            try {
              await pickImages();
            } catch (error) {
              errorMessage =
                error instanceof Error ? error.message : String(error);
              logger.deepLink.error('Deep Link Image Picker Error', {
                event: 'deep_link_image_picker_error',
                url,
                error: errorMessage,
              });
            }
          }, 500);
        } else {
          actionTaken = 'unhandled_pattern';
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      logger.deepLink.info('Deep Link Event', {
        event: 'deep_link_event',
        url,
        includesHomescreen: url.includes('charmr://open/homescreen'),
        includesScreenshot: url.includes('charmr://open/screenshot'),
        actionTaken,
        error: errorMessage,
      });
    };

    logger.deepLink.info('Deep Link Handler Setup', {
      event: 'deep_link_handler_setup',
    });

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      logger.deepLink.info('Deep Link Handler Cleanup', {
        event: 'deep_link_handler_cleanup',
      });
      subscriptionRef.current.remove();
    }

    // Listen for deep links while app is running
    subscriptionRef.current = Linking.addEventListener('url', ({url}) => {
      handleDeepLink(url);
    });

    // Check for initial deep link that launched the app
    Linking.getInitialURL().then(url => {
      logger.deepLink.debug('Deep Link Initial URL Check', {
        event: 'deep_link_initial_url_check',
        url,
      });
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      logger.deepLink.info('Deep Link Handler Cleanup', {
        event: 'deep_link_handler_cleanup',
      });
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [navigation, user, pickImages]);

  return null;
};
