import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Surface, Text} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {DevUtils} from '../utils/devUtils';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = React.useState(1);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDone();
    }
  };

  const handleSkip = () => {
    handleDone();
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      if (DevUtils.shouldBypassAuth()) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Enable Dating Keyboard
            </Text>
            <Text variant="bodyLarge" style={styles.stepDescription}>
              Follow these steps to enable Dating Buddy keyboard:
            </Text>
            {/* TODO: Add GIF here */}
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>1. Go to Settings</Text>
              <Text style={styles.stepItem}>2. Tap General</Text>
              <Text style={styles.stepItem}>3. Tap Keyboard</Text>
              <Text style={styles.stepItem}>4. Tap Keyboards</Text>
              <Text style={styles.stepItem}>5. Tap Add New Keyboard</Text>
              <Text style={styles.stepItem}>6. Select Dating Buddy</Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Set as Default Keyboard
            </Text>
            <Text variant="bodyLarge" style={styles.stepDescription}>
              For the best experience, set Dating Buddy as your default
              keyboard:
            </Text>
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>1. Go to Settings</Text>
              <Text style={styles.stepItem}>2. Tap General</Text>
              <Text style={styles.stepItem}>3. Tap Keyboard</Text>
              <Text style={styles.stepItem}>4. Tap Keyboards</Text>
              <Text style={styles.stepItem}>5. Tap Edit</Text>
              <Text style={styles.stepItem}>
                6. Drag Dating Buddy to the top
              </Text>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Register for Better Experience
            </Text>
            <Text variant="bodyLarge" style={styles.stepDescription}>
              Create an account to:
            </Text>
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>• Save your matches</Text>
              <Text style={styles.stepItem}>• Track your conversations</Text>
              <Text style={styles.stepItem}>• Get personalized responses</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.content}>
        {renderStep()}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleSkip}
            style={styles.button}
            testID="skip-button">
            Skip
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            testID={currentStep === 3 ? 'register-button' : 'next-button'}>
            {currentStep === 3 ? 'Register' : 'Next'}
          </Button>
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    padding: 24,
    borderRadius: 8,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  stepsList: {
    width: '100%',
    marginBottom: 32,
  },
  stepItem: {
    marginBottom: 8,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default OnboardingScreen;
