import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Image, Linking, StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Text} from 'react-native-paper';
import LoginModal from '../components/LoginModal';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const {createNewUser} = useStore();
  const [helpGifSource, setHelpGifSource] = useState(
    require('../../assets/grant-photo-access.gif'),
  );

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleSkip = async () => {
    try {
      await createNewUser();
      await AsyncStorage.setItem('hasOnboarded', 'true');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleShowHelp = () => {
    if (currentStep === 1) {
      setHelpGifSource(require('../../assets/grant-keyboard-access.gif'));
    } else {
      setHelpGifSource(require('../../assets/grant-photo-access.gif'));
    }
    setShowHelpModal(true);
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    handleDone();
  };

  const openKeyboardSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
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
              Follow these steps to enable Charmr keyboard:
            </Text>
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>1. Go to Settings</Text>
              <Text style={styles.stepItem}>2. Tap General</Text>
              <Text style={styles.stepItem}>3. Tap Keyboard</Text>
              <Text style={styles.stepItem}>4. Tap Keyboards</Text>
              <Text style={styles.stepItem}>5. Tap Add New Keyboard</Text>
              <Text style={styles.stepItem}>6. Select Charmr</Text>
            </View>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={openKeyboardSettings}
                style={[
                  styles.actionButton,
                  {backgroundColor: theme.colors.onPrimary},
                ]}
                textColor={theme.colors.primary}>
                Go to Settings
              </Button>
              <Button
                mode="outlined"
                onPress={handleShowHelp}
                style={[
                  styles.actionButton,
                  {borderColor: theme.colors.onPrimary},
                ]}
                textColor={theme.colors.onPrimary}>
                Need Help?
              </Button>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Select Charmr Keyboard
            </Text>
            <Text variant="bodyLarge" style={styles.stepDescription}>
              To use Charmr, you need to select it as your keyboard:
            </Text>
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>
                1. Open any app where you can type
              </Text>
              <Text style={styles.stepItem}>2. Tap the text input field</Text>
              <Text style={styles.stepItem}>
                3. When the keyboard appears, tap the globe icon
              </Text>
              <Text style={styles.stepItem}>
                4. Select "Charmr" from the list
              </Text>
              <Text style={styles.stepItem}>
                5. You can tap the globe icon anytime to switch keyboards
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={handleShowHelp}
                style={[
                  styles.actionButton,
                  {borderColor: theme.colors.onPrimary},
                ]}
                textColor={theme.colors.onPrimary}>
                Need Help?
              </Button>
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
      <View style={styles.content}>
        {renderStep()}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleSkip}
            style={styles.skipButton}
            textColor={theme.colors.onPrimary}
            testID="skip-button">
            Skip
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            textColor={theme.colors.primary}
            testID={currentStep === 3 ? 'register-button' : 'next-button'}>
            {currentStep === 3 ? 'Register' : 'Next'}
          </Button>
        </View>
      </View>
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <Portal>
        <Modal
          visible={showHelpModal}
          onDismiss={() => setShowHelpModal(false)}
          contentContainerStyle={styles.helpModal}>
          <View style={styles.helpContent}>
            <Text variant="headlineSmall" style={styles.helpTitle}>
              How to Enable Keyboard
            </Text>
            <View style={styles.gifContainer}>
              <Image
                source={helpGifSource}
                style={styles.gif}
                resizeMode="contain"
              />
            </View>
            <Button
              mode="contained"
              onPress={() => setShowHelpModal(false)}
              style={styles.closeHelpButton}
              textColor={theme.colors.primary}>
              Close
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.primary,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.onPrimary,
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: 'center',
    color: theme.colors.onPrimary,
  },
  stepsList: {
    width: '100%',
    marginBottom: 32,
  },
  stepItem: {
    marginBottom: 8,
    fontSize: 16,
    color: theme.colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  skipButton: {
    flex: 1,
    marginHorizontal: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderColor: theme.colors.onPrimary,
  },
  nextButton: {
    flex: 1,
    marginHorizontal: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 0,
    backgroundColor: theme.colors.onPrimary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineButton: {
    margin: 0,
    padding: 0,
    height: 24,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  helpModal: {
    backgroundColor: theme.colors.primary,
    margin: 0,
    flex: 1,
  },
  helpContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  helpTitle: {
    color: theme.colors.onPrimary,
    marginBottom: 24,
  },
  gifContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: theme.colors.secondary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  closeHelpButton: {
    width: '100%',
    backgroundColor: theme.colors.onPrimary,
    marginTop: 24,
  },
});

export default OnboardingScreen;
