import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'Onboarding'>;

const OnboardingScreen: React.FC<Props> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Onboarding (Web Preview)</Text>
        <Text style={styles.text}>
          Mobile keyboard setup steps are skipped in browser preview mode.
        </Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.button, styles.ghost]}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.ghostText}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.primary]}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f0835',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 560,
  },
  title: {
    color: '#7E22CE',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    color: '#555',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
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
  ghost: {
    borderWidth: 1,
    borderColor: '#cdbfe5',
  },
  ghostText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
});

export default OnboardingScreen;
