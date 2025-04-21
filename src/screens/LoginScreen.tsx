import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Text} from 'react-native-paper';
import LoginModal from '../components/LoginModal';
import {RootStackParamList} from '../navigation/types';
import {DevUtils} from '../utils/devUtils';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  console.log('LoginScreen');

  const handleLoginSuccess = async () => {
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true');
      setShowLoginModal(false);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const handleGetStarted = () => {
    navigation.navigate('Onboarding');
  };

  const handleSkipToHome = () => {
    navigation.navigate('Home');
  };

  return (
    <View testID="screen-container" style={styles.container}>
      <View testID="content-container" style={styles.content}>
        <View testID="logo-container" style={styles.logoContainer}>
          <View testID="logo-placeholder" style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>DB</Text>
          </View>
          <Text
            testID="app-title"
            variant="headlineMedium"
            style={styles.title}>
            Dating Buddy
          </Text>
          <Text
            testID="app-subtitle"
            variant="bodyLarge"
            style={styles.subtitle}>
            Your AI-powered dating assistant
          </Text>
        </View>
        <View testID="button-container" style={styles.buttonContainer}>
          <Button
            testID="login-button"
            mode="contained"
            onPress={() => setShowLoginModal(true)}
            style={styles.loginButton}
            labelStyle={styles.buttonLabel}
            textColor="#4B2EFF">
            Login
          </Button>
          <Button
            testID="get-started-button"
            mode="outlined"
            onPress={handleGetStarted}
            style={styles.getStartedButton}
            labelStyle={styles.buttonLabel}
            textColor="#FFFFFF">
            Get Started
          </Button>
          {DevUtils.shouldBypassAuth() && (
            <Button
              testID="skip-to-home-button"
              mode="text"
              onPress={handleSkipToHome}
              style={styles.devButton}
              textColor="#FFFFFF">
              Skip to Home (Dev Mode)
            </Button>
          )}
        </View>
      </View>
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
    backgroundColor: '#2A1B8C',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2A1B8C',
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 40,
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  getStartedButton: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    paddingVertical: 8,
  },
  devButton: {
    marginTop: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
