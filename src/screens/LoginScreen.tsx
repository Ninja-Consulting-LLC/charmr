import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Text} from 'react-native-paper';
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

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome Back
      </Text>
      <Button mode="contained" onPress={handleLogin} style={styles.button}>
        Login
      </Button>
      {DevUtils.shouldBypassAuth() && (
        <Button mode="outlined" onPress={handleLogin} style={styles.button}>
          Bypass Auth (Dev Mode)
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    minWidth: 200,
  },
});

export default LoginScreen;
