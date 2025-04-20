import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Surface, Text} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {DevUtils} from '../utils/devUtils';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true');
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
    <View style={styles.container}>
      <Surface style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to Dating Buddy
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Your AI-powered dating assistant
        </Text>
        <View style={styles.buttonContainer}>
          <Button mode="contained" onPress={handleLogin} style={styles.button}>
            Login
          </Button>
          <Button
            mode="outlined"
            onPress={handleGetStarted}
            style={styles.button}>
            Get Started
          </Button>
          {DevUtils.shouldBypassAuth() && (
            <Button
              mode="text"
              onPress={handleSkipToHome}
              style={styles.devButton}>
              Skip to Home (Dev Mode)
            </Button>
          )}
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
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    width: '100%',
  },
  devButton: {
    width: '100%',
    marginTop: 8,
  },
});

export default LoginScreen;
