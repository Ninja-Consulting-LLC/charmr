import React, {useState} from 'react';
import {
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import LoginModal from '../components/LoginModal';
import {
  AppText,
  CharmrButton,
  LoadingState,
  Screen,
  tokens,
} from '../design-system';
import {RootStackScreenProps} from '../navigation/types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    navigation.navigate('Home');
  };

  const handleGetStarted = async () => {
    navigation.navigate('Onboarding');
  };

  return (
    <Screen safe={false} backgroundColor="transparent">
      <View style={styles.root}>
        <LinearGradient
          colors={[tokens.color.brand.primary, tokens.color.brand.primaryStrong]}
          style={styles.gradientBackground}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        />

        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.content}>
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/logo-with-name.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.bottomSection}>
              <CharmrButton
                label="Get Started"
                variant="primary"
                fullWidth
                onPress={handleGetStarted}
                testID="get-started-button"
              />

              <CharmrButton
                label="Log In"
                variant="outline"
                fullWidth
                onPress={handleLogin}
                testID="login-button"
              />

              <AppText variant="caption" color="hero" style={styles.termsText}>
                If you continue, you agree to our{' '}
                <AppText
                  variant="caption"
                  color="hero"
                  onPress={() => Linking.openURL('https://example.invalid/terms.html')}
                  style={styles.linkText}>
                  Terms of Use
                </AppText>{' '}
                and{' '}
                <AppText
                  variant="caption"
                  color="hero"
                  onPress={() => Linking.openURL('https://example.invalid/privacy.html')}
                  style={styles.linkText}>
                  Privacy Policy
                </AppText>
                .
              </AppText>
            </View>
          </View>
        </SafeAreaView>

        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onLoadingChange={setIsLoading}
        />

        {isLoading ? (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <LoadingState
              fill={false}
              label="Signing in..."
              onHero
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space['2xl'],
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
  },
  bottomSection: {
    paddingBottom: tokens.space['3xl'],
    gap: tokens.space.lg,
  },
  termsText: {
    textAlign: 'center',
    opacity: 0.88,
  },
  linkText: {
    textDecorationLine: 'underline',
    opacity: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.overlay.heavy,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

export default LoginScreen;
