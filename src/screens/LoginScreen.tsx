import React, {useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import LoginModal from '../components/LoginModal';
import {RootStackScreenProps} from '../navigation/types';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {createNewUser} = useStore();

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
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo-with-name.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              testID="get-started-button">
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              testID="login-button">
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By clicking above, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Use</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onLoadingChange={setIsLoading}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.surface} />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    paddingHorizontal: 24,
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
    paddingBottom: 32,
    gap: 16,
  },
  getStartedButton: {
    backgroundColor: theme.colors.secondary,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  loginButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    color: theme.colors.surface,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.8,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: theme.colors.surface,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
