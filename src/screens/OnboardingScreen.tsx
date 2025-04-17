import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StyleSheet, View} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import {RootStackParamList} from '../navigation/types';
import {DevUtils} from '../utils/devUtils';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      // In dev mode with auth bypass, go straight to Home
      if (DevUtils.shouldBypassAuth()) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      // In dev mode with auth bypass, go straight to Home
      if (DevUtils.shouldBypassAuth()) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Onboarding
        onDone={handleDone}
        onSkip={handleSkip}
        skipLabel="Skip"
        showSkip={true}
        containerStyles={styles.onboardingContainer}
        titleStyles={styles.title}
        subTitleStyles={styles.subtitle}
        pages={[
          {
            backgroundColor: '#fff',
            image: <View />,
            title: 'Welcome to Wingman',
            subtitle: 'Your AI Dating Assistant',
          },
          {
            backgroundColor: '#fff',
            image: <View />,
            title: 'Upload a screenshot',
            subtitle: 'From Tinder, Hinge, or Bumble',
          },
          {
            backgroundColor: '#fff',
            image: <View />,
            title: 'Get the perfect response',
            subtitle: 'In one tap',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
