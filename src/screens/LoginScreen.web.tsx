import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  signInWithFacebookLimited,
  signInWithGoogle,
} from '../config/firebase';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGooglePreviewLogin = async () => {
    try {
      setErrorMessage(null);
      await signInWithGoogle();
      navigation.navigate('Home');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Google preview login failed.',
      );
    }
  };

  const handleFacebookPreviewLogin = async () => {
    try {
      setErrorMessage(null);
      await signInWithFacebookLimited();
      navigation.navigate('Home');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Facebook preview login failed.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Charmr</Text>
        <Text style={styles.subtitle}>
          Browser preview mode is enabled. Native sign-in SDKs are replaced with
          safe web stubs.
        </Text>

        <Pressable style={[styles.button, styles.primary]} onPress={handleGooglePreviewLogin}>
          <Text style={styles.primaryText}>Continue with Google (Preview)</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={handleFacebookPreviewLogin}>
          <Text style={styles.secondaryText}>Continue with Facebook (Preview)</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.ghost]}
          onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.ghostText}>View onboarding preview</Text>
        </Pressable>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f0835',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#7E22CE',
    fontWeight: '700',
    fontSize: 34,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#40E0D0',
  },
  primaryText: {
    color: '#111',
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#e6e0f3',
  },
  secondaryText: {
    color: '#3f2b5f',
    fontWeight: '600',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cdbfe5',
  },
  ghostText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
  error: {
    color: '#d32f2f',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoginScreen;
