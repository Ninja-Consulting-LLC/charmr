import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useMemo, useState} from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import LoginModal from '../components/LoginModal';
import {
  getOnboardingStepConfig,
  ONBOARDING_STEP_COUNT,
} from '../constants/onboardingCopy';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  Screen,
  tokens,
} from '../design-system';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store/StoreProvider';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const c = tokens.color;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const {height: windowHeight} = useWindowDimensions();
  const helpSheetMaxHeight = Math.round(windowHeight * 0.88);
  const helpGifHeight = Math.min(280, Math.round(windowHeight * 0.36));
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const {createNewUser} = useStore();
  const [helpGifSource, setHelpGifSource] = useState(
    () => require('../../assets/grant-keyboard-access.gif'),
  );

  const stepConfig = useMemo(
    () => getOnboardingStepConfig(currentStep),
    [currentStep],
  );

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEP_COUNT) {
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

  const renderStepBody = () => {
    const numberedList = currentStep < 3;
    return (
      <View style={styles.stepContent}>
        <View style={styles.progressRow} accessibilityRole="header">
          <AppText variant="caption" color="heroMuted" style={styles.stepOfLabel}>
            Step {currentStep} of {ONBOARDING_STEP_COUNT}
          </AppText>
          <View style={styles.dots} accessibilityLabel={`Step ${currentStep}`}>
            {Array.from({length: ONBOARDING_STEP_COUNT}, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i + 1 === currentStep ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        <AppText variant="title" color="hero" style={styles.stepTitle}>
          {stepConfig.title}
        </AppText>
        <AppText variant="body" color="heroMuted" style={styles.stepDescription}>
          {stepConfig.description}
        </AppText>
        <View style={styles.stepsList}>
          {stepConfig.bullets.map((line, index) => (
            <AppText
              key={index}
              variant="body"
              color="hero"
              style={styles.stepItem}>
              {numberedList ? `${index + 1}. ${line}` : `\u2022 ${line}`}
            </AppText>
          ))}
        </View>
        <View style={styles.actionButtons}>
          {stepConfig.showOpenSettings ? (
            <CharmrButton
              label="Open Settings"
              variant="heroEmphasis"
              fullWidth
              onPress={openKeyboardSettings}
              accessibilityLabel="Open your phone Settings app"
              accessibilityHint="Opens system settings so you can add the keyboard"
            />
          ) : null}
          {currentStep < 3 ? (
            <CharmrButton
              label="Show me how"
              variant="outline"
              fullWidth
              onPress={handleShowHelp}
              accessibilityLabel="Show me how"
              accessibilityHint="Opens a short animated guide"
            />
          ) : null}
        </View>
      </View>
    );
  };

  const primaryFooterLabel =
    currentStep === ONBOARDING_STEP_COUNT ? 'Create account' : 'Next';

  return (
    <Screen safe={false} backgroundColor="transparent">
      <View style={styles.root}>
        <LinearGradient
          colors={[c.brand.primary, c.brand.primaryStrong]}
          style={styles.gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.content}>
            {renderStepBody()}
            <View style={styles.footer}>
              <CharmrButton
                label="Skip for now"
                variant="outline"
                onPress={handleSkip}
                testID="skip-button"
                style={styles.footerButton}
                accessibilityLabel="Skip setup for now"
                accessibilityHint="Continues without signing in. You can set up the keyboard later in Settings."
              />
              <CharmrButton
                label={primaryFooterLabel}
                variant="primary"
                onPress={handleNext}
                testID={
                  currentStep === ONBOARDING_STEP_COUNT
                    ? 'register-button'
                    : 'next-button'
                }
                style={styles.footerButton}
                accessibilityLabel={primaryFooterLabel}
              />
            </View>
          </View>
        </SafeAreaView>
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
        <Portal>
          <Modal
            visible={showHelpModal}
            theme={darkModalPaperTheme}
            onDismiss={() => setShowHelpModal(false)}
            contentContainerStyle={paperModalContent.shell}>
            <ThemeProvider theme={darkModalPaperTheme}>
              <ModalSheet padded style={[styles.helpSheet, {maxHeight: helpSheetMaxHeight}]}>
                <AppText variant="titleSm" color="hero" style={styles.helpTitle}>
                  {stepConfig.helpTitle || 'Tips'}
                </AppText>
                <Image
                  source={helpGifSource}
                  style={[styles.helpGif, {height: helpGifHeight}]}
                  resizeMode="contain"
                />
                <CharmrButton
                  label="Got it"
                  variant="primary"
                  onPress={() => setShowHelpModal(false)}
                  fullWidth
                />
              </ModalSheet>
            </ThemeProvider>
          </Modal>
        </Portal>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: tokens.space['2xl'],
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: tokens.space.lg,
    gap: tokens.space.sm,
  },
  stepOfLabel: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: tokens.space.xs,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: c.hero.text,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepTitle: {
    marginBottom: tokens.space.md,
    textAlign: 'center',
  },
  stepDescription: {
    marginBottom: tokens.space.lg,
    textAlign: 'center',
  },
  stepsList: {
    width: '100%',
    marginBottom: tokens.space.lg,
  },
  stepItem: {
    marginBottom: tokens.space.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  footerButton: {
    flex: 1,
  },
  actionButtons: {
    width: '100%',
    gap: tokens.space.md,
    marginTop: tokens.space.md,
  },
  helpSheet: {
    alignItems: 'stretch',
    gap: tokens.space.lg,
  },
  helpTitle: {
    textAlign: 'center',
  },
  helpGif: {
    width: '100%',
    borderRadius: tokens.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border.subtle,
  },
});

export default OnboardingScreen;
