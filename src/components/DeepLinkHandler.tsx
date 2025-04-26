import {useNavigation} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {Linking} from 'react-native';
import {useImagePicker} from '../hooks/useImagePicker';
import {useStore} from '../store';

export const DeepLinkHandler: React.FC = () => {
  const {user} = useStore();
  const navigation = useNavigation();
  const {pickImages} = useImagePicker();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('🔍 Deep Link Analysis:');
      console.log('  - Full URL:', url);
      console.log(
        '  - URL includes /homescreen:',
        url.includes('charmr://open/homescreen'),
      );
      console.log(
        '  - URL includes /screenshot:',
        url.includes('charmr://open/screenshot'),
      );

      if (url.includes('charmr://open/homescreen')) {
        console.log('📱 Navigating to Home screen');
        navigation.navigate('Home' as never);
      } else if (url.includes('charmr://open/screenshot')) {
        console.log('📸 Opening screenshot upload flow:');
        console.log('  1. Navigating to Home screen');
        navigation.navigate('Home' as never);

        console.log('  2. Waiting for navigation to complete...');
        setTimeout(async () => {
          try {
            console.log('  3. Attempting to open image picker...');
            await pickImages();
            console.log('  ✅ Image picker opened successfully');
          } catch (error) {
            console.error('  ❌ Error opening image picker:', error);
          }
        }, 500);
      } else {
        console.log('⚠️ Unhandled deep link URL pattern');
      }
    };

    console.log('🔄 Setting up deep link handlers...');

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({url}) => {
      console.log('📨 Received deep link event while app running:', url);
      handleDeepLink(url);
    });

    // Check for initial deep link that launched the app
    Linking.getInitialURL().then(url => {
      console.log('🚀 Checking initial deep link URL:', url);
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      console.log('♻️ Cleaning up deep link handlers');
      subscription.remove();
    };
  }, [navigation, user, pickImages]);

  return null;
};
