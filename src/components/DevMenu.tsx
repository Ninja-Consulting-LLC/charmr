import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {Button, Switch, Text} from 'react-native-paper';
import {generateReply} from '../services/api';
import {DevUtils} from '../utils/devUtils';

const DevMenu = () => {
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testResults, setTestResults] = useState<
    Array<{prompt: string; success: boolean; error?: string}>
  >([]);
  const [skipRateLimiting, setSkipRateLimiting] = useState(false);

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

  const handleTestRateLimiting = async () => {
    setError(null);
    setTestStatus('Starting rate limit test...');
    setTestResults([]);

    const testPrompts = [
      'make it flirty',
      'make it funny',
      'make it smooth',
      'make it casual',
      'make it confident',
    ];

    for (let i = 0; i < testPrompts.length; i++) {
      const currentPrompt = testPrompts[i];
      setTestStatus(
        `Making test request ${i + 1}/${
          testPrompts.length
        }: "${currentPrompt}"`,
      );

      try {
        const result = await generateReply({
          prompt: currentPrompt,
          images: ['test-image-base64'], // Using a dummy image
          userId: 'test-user',
          skipRateLimiting,
        });
        console.log(`Request ${i + 1} succeeded:`, result);
        setTestResults(prev => [
          ...prev,
          {prompt: currentPrompt, success: true},
        ]);
      } catch (error) {
        console.log(`Request ${i + 1} failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setTestResults(prev => [
          ...prev,
          {prompt: currentPrompt, success: false, error: errorMessage},
        ]);
        if (error instanceof Error) {
          setError(error.message);
          break;
        }
      }
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTestStatus('Test completed');
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Development Menu
      </Text>

      <View style={styles.toggleContainer}>
        <Text>Skip Rate Limiting</Text>
        <Switch value={skipRateLimiting} onValueChange={setSkipRateLimiting} />
      </View>

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

        <Button
          mode="contained"
          onPress={handleTestRateLimiting}
          style={styles.button}>
          Test Rate Limiting
        </Button>
      </View>

      {testStatus && (
        <Text style={styles.statusText} variant="bodySmall">
          {testStatus}
        </Text>
      )}

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text variant="bodySmall" style={styles.resultsTitle}>
            Test Results:
          </Text>
          {testResults.map((result, index) => (
            <Text
              key={index}
              style={[
                styles.resultText,
                result.success ? styles.successText : styles.errorText,
              ]}
              variant="bodySmall">
              {index + 1}. "{result.prompt}" -{' '}
              {result.success ? 'Success' : `Failed: ${result.error}`}
            </Text>
          ))}
        </View>
      )}

      {error && (
        <Text style={styles.errorText} variant="bodySmall">
          {error}
        </Text>
      )}
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    minWidth: 150,
  },
  statusText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  resultsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultText: {
    marginBottom: 2,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
});

export default DevMenu;
