import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Modal, Portal} from 'react-native-paper';
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
    } else if (currentStep === 2) {
      setHelpGifSource(require('../../assets/charmr-keyboard-tutorial.gif'));
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
            <Text style={styles.stepTitle}>Enable Dating Keyboard</Text>
            <Text style={styles.stepDescription}>
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
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryActionButton,
                  {backgroundColor: theme.colors.onPrimary},
                ]}
                onPress={openKeyboardSettings}>
                <Text
                  style={[
                    styles.actionButtonText,
                    {color: theme.colors.primary},
                  ]}>
                  Go to Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryActionButton,
                  {borderColor: theme.colors.onPrimary},
                ]}
                onPress={handleShowHelp}>
                <Text
                  style={[
                    styles.actionButtonText,
                    {color: theme.colors.onPrimary},
                  ]}>
                  Need Help?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Charmr Keyboard</Text>
            <Text style={styles.stepDescription}>
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
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryActionButton,
                  {borderColor: theme.colors.onPrimary},
                ]}
                onPress={handleShowHelp}>
                <Text
                  style={[
                    styles.actionButtonText,
                    {color: theme.colors.onPrimary},
                  ]}>
                  Need Help?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Register for Better Experience</Text>
            <Text style={styles.stepDescription}>Create an account to:</Text>
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
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            testID="skip-button">
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            testID={currentStep === 3 ? 'register-button' : 'next-button'}>
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? 'Register' : 'Next'}
            </Text>
          </TouchableOpacity>
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
            <Text style={styles.helpTitle}>
              {currentStep === 2
                ? 'Charmr Keyboard Tutorial'
                : 'How to Enable Keyboard'}
            </Text>
            <View style={styles.gifContainer}>
              <Image
                source={helpGifSource}
                style={styles.gif}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.closeHelpButton}
              onPress={() => setShowHelpModal(false)}>
              <Text style={styles.closeHelpButtonText}>Close</Text>
            </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: '600',
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: 'center',
    color: theme.colors.onPrimary,
    fontSize: 16,
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
    borderWidth: 1,
    borderColor: theme.colors.onPrimary,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    marginHorizontal: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.onPrimary,
  },
  nextButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
  primaryActionButton: {
    backgroundColor: theme.colors.onPrimary,
  },
  secondaryActionButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '600',
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
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.onPrimary,
    marginTop: 24,
  },
  closeHelpButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
