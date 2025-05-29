import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {Alert, Animated, ScrollView, StyleSheet, View} from 'react-native';
import Config from 'react-native-config';
import {Button, IconButton, Switch, Text} from 'react-native-paper';
import {config} from '../config/config';
import {RootStackParamList} from '../navigation/types';
import {generateReply, resetDb, testContext} from '../services/api';
import axiosInstance from '../services/axiosInstance';
import {simulateProEntitlement} from '../services/revenueCatService';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {DevUtils} from '../utils/devUtils';
import {logger} from '../utils/logger';

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
    matches,
    setMatches,
  } = useStore();

  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(400)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Add this new state for API debugging
  const [apiDebugResult, setApiDebugResult] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Add more network debugging info
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [networkLoading, setNetworkLoading] = useState(false);

  useEffect(() => {
    const checkSandboxMode = async () => {
      const mode = await DevUtils.isSandboxMode();
      setIsSandboxMode(mode);
    };
    checkSandboxMode();
  }, []);

  useEffect(() => {
    if (showDevMenu) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [showDevMenu, slideAnim, fadeAnim]);

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
      setMatches([]);
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
      const response = await axiosInstance.post(
        `${config.apiBaseUrl}/api/admin/users/${userId}/reset-message-limit`,
        {},
        {
          headers: {
            Authorization: `Bearer ${Config.ADMIN_TOKEN}`,
            'X-Auth-Bypass': 'true',
          },
        },
      );

      logger.app.info('Reset message limit response', response.data);

      // Fetch fresh user data from backend
      const userResponse = await axiosInstance.get(
        `${config.apiBaseUrl}/api/users/${userId}`,
        {
          headers: {
            'X-Auth-Bypass': 'true',
          },
        },
      );

      if (userResponse.data) {
        setUser(userResponse.data);
        Alert.alert('Success', 'Message limit reset successfully');
      }
    } catch (error) {
      console.error('Error resetting message limit:', error);
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

  const handleChangePlan = async (plan: SubscriptionTier) => {
    try {
      await updateUserPlan(plan);
      Alert.alert('Success', `Plan changed to ${plan}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change plan');
    }
  };

  const handleResetDb = async () => {
    try {
      await resetDb();
      Alert.alert('Development', 'Firestore database reset successfully');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to reset Firestore database');
    }
  };

  const handleSimulateProEntitlement = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user ID available');
      return;
    }

    try {
      await simulateProEntitlement(userId);
      await updateUserPlan(SubscriptionTier.PRO);
      Alert.alert('Success', 'Pro entitlement simulated successfully');
    } catch (error) {
      console.error('Failed to simulate pro entitlement:', error);
      Alert.alert('Error', 'Failed to simulate pro entitlement');
    }
  };

  // Minimal test for /health endpoint
  const handleTestApiConnection = async () => {
    console.log('Testing API connection');

    axios
      .get('https://ai-dating-keyboard.onrender.com/health', {
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          Accept: 'application/json',
          Connection: 'keep-alive',
        },
      })
      .then(res => console.log('✅ Success:', res.data))
      .catch(err => console.log('❌ Error:', {...err}));
  };

  const handleTestApi = async () => {
    try {
      const response = await axiosInstance.get('/api/test');
      Alert.alert('Success', JSON.stringify(response.data));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleTestAuth = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/test');
      Alert.alert('Success', JSON.stringify(response.data));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  if (!isVisible && !showDevMenu) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: fadeAnim,
          },
        ]}
        onTouchEnd={() => setShowDevMenu(false)}
      />
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.colors.surface,
            transform: [{translateX: slideAnim}],
          },
        ]}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={() => setShowDevMenu(false)}
            style={styles.closeButton}
          />
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text variant="titleMedium" style={styles.title}>
                Development Menu
              </Text>
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

              <View style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Storage & Database
                </Text>
                <Button
                  mode="contained"
                  onPress={handleClearStorage}
                  style={styles.button}>
                  Clear Storage
                </Button>
                <Button
                  mode="contained"
                  onPress={handleResetDb}
                  style={styles.button}>
                  Reset Database
                </Button>
                <Button
                  mode="contained"
                  onPress={handleInspectStorage}
                  style={styles.button}>
                  Inspect Storage
                </Button>
              </View>

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
                    onPress={() => handleChangePlan(SubscriptionTier.FREE)}
                    style={styles.planButton}>
                    Free
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleChangePlan(SubscriptionTier.PRO)}
                    style={styles.planButton}>
                    Pro
                  </Button>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RevenueCat Testing</Text>
                <Button
                  mode="contained"
                  onPress={handleSimulateProEntitlement}
                  style={styles.button}>
                  Simulate Pro Subscription
                </Button>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>API Debugging</Text>
                <Button
                  mode="contained"
                  onPress={handleTestApiConnection}
                  disabled={isTestingApi}
                  style={styles.button}>
                  {isTestingApi ? 'Testing API...' : 'Test API Connection'}
                </Button>

                <View style={styles.infoBox}>
                  <Text>API Base URL: {config.apiBaseUrl}</Text>
                </View>

                {networkInfo && (
                  <View style={styles.resultSection}>
                    <Text style={styles.subsectionTitle}>
                      Network Information
                    </Text>
                    <Text>
                      Connected: {networkInfo.isConnected ? 'Yes' : 'No'}
                    </Text>
                    <Text>
                      Internet Reachable:{' '}
                      {networkInfo.isInternetReachable ? 'Yes' : 'No'}
                    </Text>
                    <Text>Type: {networkInfo.type}</Text>
                    {networkInfo.details && (
                      <View style={styles.jsonData}>
                        <Text>
                          {JSON.stringify(networkInfo.details, null, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {apiDebugResult && (
                  <View style={styles.resultSection}>
                    <Text
                      style={{
                        color: apiDebugResult.success
                          ? theme.colors.primary
                          : theme.colors.error,
                        fontWeight: 'bold',
                        marginBottom: 8,
                      }}>
                      {apiDebugResult.success ? 'SUCCESS' : 'FAILED'}
                    </Text>
                    <Text style={{marginBottom: 8}}>
                      {apiDebugResult.message}
                    </Text>
                    {apiDebugResult.details && (
                      <View style={styles.jsonData}>
                        <Text>
                          {JSON.stringify(apiDebugResult.details, null, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  drawer: {
    flex: 1,
    width: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    flex: 1,
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
  section: {
    marginTop: 16,
    padding: 8,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 4,
  },
  sectionTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  resultSection: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    marginBottom: 10,
  },
  jsonData: {
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
  },
  infoBox: {
    padding: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    marginVertical: 8,
  },
  subsectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

export default DevMenu;
