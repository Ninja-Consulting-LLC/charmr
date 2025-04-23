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
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import LoginModal from '../components/LoginModal';
import {RootStackScreenProps} from '../navigation/types';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const GLOW_SIZE = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 2;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Animation value for the glow effect
  const glowAnimation = useSharedValue(0);

  React.useEffect(() => {
    // Start the glow animation
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 4000}),
        withTiming(0, {duration: 4000}),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(glowAnimation.value, [0, 1], [0.9, 1.1]);
    const opacity = interpolate(glowAnimation.value, [0, 1], [0.7, 1]);
    const rotate = interpolate(glowAnimation.value, [0, 1], [0, 45]);

    return {
      transform: [{scale}, {rotate: `${rotate}deg`}],
      opacity,
    };
  });

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    navigation.navigate('Home');
  };

  const handleGetStarted = () => {
    navigation.navigate('Onboarding');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7E22CE', '#3B0764']}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />

      {/* Animated glow effect */}
      <AnimatedLinearGradient
        colors={[
          'transparent',
          'rgba(99, 39, 120, 0.1)',
          'rgba(99, 39, 120, 0.4)',
          'rgba(99, 39, 120, 0.8)',
          'rgba(99, 39, 120, 0.4)',
          'rgba(99, 39, 120, 0.1)',
          'transparent',
        ]}
        style={[styles.glowEffect, glowStyle]}
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
            {/* <Text style={styles.title}>Flirtonic</Text> */}
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
  glowEffect: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    left: -GLOW_SIZE / 4,
    top: -GLOW_SIZE / 4,
    opacity: 0.8,
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
  title: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  bottomSection: {
    gap: 16,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    backgroundColor: 'rgba(150, 242, 215, 0.9)',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#96F2D7',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedButtonText: {
    color: '#000',
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
    color: '#fff',
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
    color: '#fff',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
