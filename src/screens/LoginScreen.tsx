import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState} from 'react';
import {
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
import {useStore} from '../store';
import {theme} from '../theme/theme';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const {createNewUser} = useStore();

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    navigation.navigate('Home');
  };

  const handleGetStarted = async () => {
    try {
      await createNewUser();
      navigation.navigate('Onboarding');
    } catch (error) {
      console.error('Error creating user:', error);
      // Handle error appropriately
    }
  };

  const handleDevBypass = async () => {
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true');
      await AsyncStorage.setItem('hasOnboarded', 'true');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error in dev bypass:', error);
    }
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

            {__DEV__ && (
              <TouchableOpacity
                style={styles.devBypassButton}
                onPress={handleDevBypass}
                testID="dev-bypass-button">
                <Text style={styles.devBypassButtonText}>Dev Mode Bypass</Text>
              </TouchableOpacity>
            )}

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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.15,
  },
  logo: {
    width: 400,
    height: 400,
    marginBottom: 20,
  },
  bottomSection: {
    gap: 16,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    width: '100%',
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedButtonText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loginButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '500',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 16,
  },
  linkText: {
    color: theme.colors.surface,
    textDecorationLine: 'underline',
  },
  devBypassButton: {
    backgroundColor: theme.colors.error,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  devBypassButtonText: {
    color: theme.colors.onError,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LoginScreen;
