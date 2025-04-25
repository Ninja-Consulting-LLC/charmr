import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Switch, Text} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {generateReply, testContext} from '../services/api';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {UserPlan} from '../types/enums';
import {DevUtils} from '../utils/devUtils';

type DevMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DevMenu = () => {
  const navigation = useNavigation<DevMenuNavigationProp>();
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testResults, setTestResults] = useState<
    Array<{prompt: string; success: boolean; error?: string}>
  >([]);
  const [authBypass, setAuthBypass] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const {
    userId,
    skipRateLimiting,
    setSkipRateLimiting,
    user,
    setUser,
    showDevMenu,
    setShowDevMenu,
    updateUserPlan,
  } = useStore();

  useEffect(() => {
    const checkSandboxMode = async () => {
      const mode = await DevUtils.isSandboxMode();
      setIsSandboxMode(mode);
    };
    checkSandboxMode();
  }, []);

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

  const handleClearMatchStorage = async () => {
    try {
      await DevUtils.clearMatchStorage();
      Alert.alert('Development', 'Match storage cleared successfully');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to clear match storage');
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

  const handleToggleSandboxMode = async (value: boolean) => {
    try {
      await DevUtils.toggleSandboxMode();
      const newMode = await DevUtils.isSandboxMode();
      setIsSandboxMode(newMode);
      Alert.alert(
        'Development',
        `Sandbox mode ${newMode ? 'enabled' : 'disabled'}`,
      );
    } catch (error) {
      Alert.alert('Development Error', 'Failed to toggle sandbox mode');
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
          images: ['test-image-base64'],
          userId: 'test-user',
          skipRateLimiting,
          matchId: 'test-match',
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTestStatus('Test completed');
  };

  const handleTestContext = async () => {
    try {
      await testContext();
      Alert.alert('Success', 'Context test completed successfully');
    } catch (error) {
      console.error('Error testing context:', error);
      Alert.alert('Error', 'Failed to test context');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isAuthenticated');
      setShowDevMenu(false);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to logout');
    }
  };

  const handleResetMessageLimit = async () => {
    try {
      const response = await axios.post(
        `http://localhost:3001/api/admin/users/${userId}/reset-limit`,
        {},
        {
          headers: {
            Authorization: 'Bearer dev-admin-token',
          },
        },
      );

      if (response.data.message === 'Message limit reset successfully') {
        // Update the user state with the reset values
        setUser({
          ...user,
          dailyMessagesUsed: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        });
        Alert.alert('Success', 'Message limit reset successfully');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Reset message limit error:', error);
      Alert.alert('Error', 'Failed to reset message limit');
    }
  };

  const handleAddTestMessages = () => {
    setUser({
      ...user,
      extraMessages: (user.extraMessages || 0) + 10,
    });
  };

  const handleRemoveTestMessages = () => {
    setUser({
      ...user,
      extraMessages: Math.max(0, (user.extraMessages || 0) - 10),
    });
  };

  const handleChangePlan = async (plan: UserPlan) => {
    try {
      await updateUserPlan(plan);
      Alert.alert('Success', `Plan changed to ${plan}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change plan');
    }
  };

  if (!showDevMenu) return null;

  return (
    <Portal>
      <Modal
        visible={showDevMenu}
        onDismiss={() => setShowDevMenu(false)}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              Development Menu
            </Text>
            <Button
              mode="text"
              onPress={() => setShowDevMenu(false)}
              style={styles.closeButton}>
              Close
            </Button>
          </View>

          <View style={styles.toggleContainer}>
            <Text>Auth Bypass</Text>
            <Switch value={authBypass} onValueChange={setAuthBypass} />
          </View>

          <View style={styles.toggleContainer}>
            <Text>Sandbox Mode (No ChatGPT)</Text>
            <Switch
              value={isSandboxMode}
              onValueChange={handleToggleSandboxMode}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleLogout}
              style={styles.button}>
              Logout
            </Button>

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
              onPress={handleClearMatchStorage}
              style={styles.button}>
              Clear Match Storage
            </Button>

            <Button
              mode="contained"
              onPress={handleInspectStorage}
              style={styles.button}>
              Inspect Storage
            </Button>

            <Button
              mode="contained"
              onPress={handleTestContext}
              style={styles.button}>
              Test Context
            </Button>

            <Button
              mode="contained"
              onPress={handleTestRateLimiting}
              style={styles.button}>
              Test Rate Limiting
            </Button>

            <Button
              mode="contained"
              onPress={handleResetMessageLimit}
              style={styles.button}>
              Reset Message Limit (Current User)
            </Button>

            <Button
              mode="contained"
              onPress={handleAddTestMessages}
              style={styles.button}>
              Add Test Messages (+10)
            </Button>

            <Button
              mode="contained"
              onPress={handleRemoveTestMessages}
              style={styles.button}>
              Remove Test Messages (-10)
            </Button>

            <View style={styles.planButtonsContainer}>
              <Text variant="titleSmall" style={styles.planTitle}>
                Change Plan
              </Text>
              <View style={styles.planButtons}>
                <Button
                  mode="contained"
                  onPress={() => handleChangePlan(UserPlan.FREE)}
                  style={styles.planButton}>
                  Free
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleChangePlan(UserPlan.PLUS)}
                  style={styles.planButton}>
                  Plus
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleChangePlan(UserPlan.PREMIUM)}
                  style={styles.planButton}>
                  Premium
                </Button>
              </View>
            </View>
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
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: theme.roundness,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    marginLeft: 8,
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
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: `${theme.colors.primary}10`,
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
    color: theme.colors.error,
    textAlign: 'center',
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  planButtonsContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 4,
  },
  planTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  planButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  planButton: {
    flex: 1,
  },
});

export default DevMenu;
