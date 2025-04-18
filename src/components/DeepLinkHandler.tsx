import {useNavigation} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {Linking} from 'react-native';
import {useStore} from '../store';

export const DeepLinkHandler: React.FC = () => {
  const {setShowKeyboardModal} = useStore();
  const navigation = useNavigation();

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Handling deep link:', url);
      if (url.includes('aidatingkeyboard://open/gptmodal')) {
        console.log('Setting keyboard modal visible');
        setShowKeyboardModal(true);
        // Navigate to Home if not already there
        navigation.navigate('Home' as never);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({url}) => {
      console.log('Received deep link event:', url);
      handleDeepLink(url);
    });

    // Check for initial deep link
    Linking.getInitialURL().then(url => {
      console.log('Initial URL:', url);
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, [navigation, setShowKeyboardModal]);

  return null;
};
