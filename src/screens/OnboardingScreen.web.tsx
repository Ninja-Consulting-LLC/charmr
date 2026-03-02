import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'Onboarding'>;

const OnboardingScreen: React.FC<Props> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Onboarding (Web Preview)</Text>
        <Text style={styles.text}>
          Keyboard setup steps are only available on iOS/Android. Continue to the
          app preview.
        </Text>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.ghost]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.ghostText}>Back to Login</Text>
        </Pressable>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7E22CE',
    marginBottom: 10,
  },
  text: {
    color: '#555',
    marginBottom: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primary: {
    backgroundColor: '#40E0D0',
  },
  primaryText: {
    color: '#111',
    fontWeight: '600',
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#d8caed',
  },
  ghostText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
});

export default OnboardingScreen;
