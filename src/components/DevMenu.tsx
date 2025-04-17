import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {Button, Text} from 'react-native-paper';
import {DevUtils} from '../utils/devUtils';

const DevMenu = () => {
  if (!__DEV__) {
    return null;
  }

  const handleResetOnboarding = async () => {
    try {
      await DevUtils.resetOnboarding();
      Alert.alert('Development', 'Onboarding status reset');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to reset onboarding');
    }
  };

  const handleClearStorage = async () => {
    try {
      await DevUtils.clearStorage();
      Alert.alert('Development', 'Storage cleared successfully');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to clear storage');
    }
  };

  const handleInspectStorage = async () => {
    try {
      await DevUtils.inspectStorage();
      Alert.alert('Development', 'Storage contents logged to console');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to inspect storage');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Development Menu
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleResetOnboarding}
          style={styles.button}>
          Reset Onboarding
        </Button>

        <Button
          mode="contained"
          onPress={handleClearStorage}
          style={styles.button}>
          Clear Storage
        </Button>

        <Button
          mode="contained"
          onPress={handleInspectStorage}
          style={styles.button}>
          Inspect Storage
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    minWidth: 150,
  },
});

export default DevMenu;
