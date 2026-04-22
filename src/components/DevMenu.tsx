import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {Alert, Animated, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {IconButton, Switch, Text} from 'react-native-paper';
import {config} from '../config/config';
import {RootStackParamList} from '../navigation/types';
import {generateReply, resetDb, testContext} from '../services/api';
import axiosInstance from '../services/axiosInstance';
import {CharmrButton, tokens} from '../design-system';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {DevUtils} from '../utils/devUtils';
import {logger} from '../utils/logger';

const tc = tokens.color;
/** Light panel surfaces (dev drawer matches Paper light chrome) */
const light = {
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  outline: '#E4E4E7',
  primaryTint: 'rgba(126, 34, 206, 0.08)',
};

type DevMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DevMenu = () => {
  const navigation = useNavigation<DevMenuNavigationProp>();
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testResults, setTestResults] = useState<
    Array<{prompt: string; success: boolean; error?: string}>
  >([]);
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
    authBypass,
    setAuthBypass,
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
      Alert.alert('Development', 'Onboarding reset successfully');
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
      Alert.alert(
        'Development',
        'Storage inspection completed. Check logs for details.',
      );
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
      await AsyncStorage.removeItem('@charmr/isAuthenticated');
      setShowDevMenu(false);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Development Error', 'Failed to logout');
    }
  };

  /** Saturate daily quota via dev-only API (local backend NODE_ENV=development). */
  /** E2E / D4: local store looks like a registered user (locked email in Support); still uses current userId + anonymous API. */
  const handleE2ESimulateRegisteredProfile = () => {
    setAuthBypass(false);
    setUser({
      ...user,
      email: 'e2e.registered@charmr.test',
      name: user.name ?? 'E2E Registered',
    });
    setShowDevMenu(false);
  };

  const handleE2ESaturateMessageLimit = async () => {
    if (!userId) {
      Alert.alert('E2E', 'No userId');
      return;
    }
    try {
      await axiosInstance.post('/api/dev/e2e/saturate-message-limit', {
        userId,
      });
      const userResponse = await axiosInstance.get(`/api/users/${userId}`);
      if (userResponse.data) {
        setUser(userResponse.data);
      }
      Alert.alert('E2E', 'Daily message limit saturated for this user');
    } catch (error) {
      console.error('E2E saturate message limit:', error);
      Alert.alert(
        'E2E Error',
        'Saturate failed (needs local backend with NODE_ENV=development and /api/dev mounted).',
      );
    }
  };

  const handleResetMessageLimit = async () => {
    try {
      const response = await axiosInstance.post(
        `${config.apiBaseUrl}/api/admin/users/${userId}/reset-message-limit`,
        {},
        {
          headers: {
            'X-Auth-Bypass': 'true',
          },
        },
      );

      logger.app.debug('Reset message limit response', response.data);

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
      console.log('[DevMenu] Plan changed to', plan);
    } catch (error) {
      console.error('[DevMenu] Failed to change plan', error);
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

  if (!isVisible && !showDevMenu) {return null;}

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
            backgroundColor: light.surface,
            transform: [{translateX: slideAnim}],
          },
        ]}>
        <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.header}>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowDevMenu(false)}
              testID="dev-menu-close-button"
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
              <Switch value={isSandboxMode} onValueChange={() => {}} />
            </View>

            <View style={styles.buttonContainer}>
              <CharmrButton
                testID="dev-menu-logout-button"
                label="Logout"
                variant="primary"
                fullWidth
                onPress={handleLogout}
                style={styles.button}
              />

              <CharmrButton
                label="Reset Onboarding"
                variant="primary"
                fullWidth
                onPress={handleResetOnboarding}
                style={styles.button}
              />

              <View style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Storage & Database
                </Text>
                <CharmrButton
                  label="Clear Storage"
                  variant="primary"
                  fullWidth
                  onPress={handleClearStorage}
                  style={styles.button}
                />
                <CharmrButton
                  label="Reset Database"
                  variant="primary"
                  fullWidth
                  onPress={handleResetDb}
                  style={styles.button}
                />
                <CharmrButton
                  label="Inspect Storage"
                  variant="primary"
                  fullWidth
                  onPress={handleInspectStorage}
                  style={styles.button}
                />
              </View>

              <CharmrButton
                label="Test Context"
                variant="primary"
                fullWidth
                onPress={handleTestContext}
                style={styles.button}
              />

              <CharmrButton
                label="Test Rate Limiting"
                variant="primary"
                fullWidth
                onPress={handleTestRateLimiting}
                style={styles.button}
              />

              <CharmrButton
                label="Reset Message Limit (Current User)"
                variant="primary"
                fullWidth
                onPress={handleResetMessageLimit}
                style={styles.button}
              />

              <CharmrButton
                testID="dev-menu-e2e-simulate-registered"
                label="E2E: Simulate registered profile (locked email)"
                variant="primary"
                fullWidth
                onPress={handleE2ESimulateRegisteredProfile}
                style={styles.button}
              />

              <CharmrButton
                testID="dev-menu-e2e-saturate-limit"
                label="E2E: Saturate daily message limit"
                variant="primary"
                fullWidth
                onPress={handleE2ESaturateMessageLimit}
                style={styles.button}
              />

              <CharmrButton
                label="Add Test Messages (+10)"
                variant="primary"
                fullWidth
                onPress={handleAddTestMessages}
                style={styles.button}
              />

              <CharmrButton
                label="Remove Test Messages (-10)"
                variant="primary"
                fullWidth
                onPress={handleRemoveTestMessages}
                style={styles.button}
              />

              <View style={styles.planButtonsContainer}>
                <Text variant="titleSmall" style={styles.planTitle}>
                  Change Plan
                </Text>
                <View style={styles.planButtons}>
                  <CharmrButton
                    testID="dev-menu-plan-free"
                    label="Free"
                    variant="primary"
                    fullWidth
                    onPress={() => handleChangePlan(SubscriptionTier.FREE)}
                    style={styles.planButton}
                  />
                  <CharmrButton
                    testID="dev-menu-plan-pro"
                    label="Pro"
                    variant="primary"
                    fullWidth
                    onPress={() => handleChangePlan(SubscriptionTier.PRO)}
                    style={styles.planButton}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>API Debugging</Text>
                <CharmrButton
                  label={isTestingApi ? 'Testing API...' : 'Test API Connection'}
                  variant="primary"
                  fullWidth
                  onPress={handleTestApiConnection}
                  disabled={isTestingApi}
                  loading={isTestingApi}
                  style={styles.button}
                />

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
                          ? tc.brand.primary
                          : tc.semantic.danger,
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
        </SafeAreaView>
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
  drawerSafe: {
    flex: 1,
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
    color: tc.text.secondary,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: light.primaryTint,
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
    color: tc.semantic.danger,
    textAlign: 'center',
  },
  buttonText: {
    color: light.surface,
    fontWeight: 'bold',
  },
  planButtonsContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: light.primaryTint,
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
    backgroundColor: light.primaryTint,
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
    borderColor: light.outline,
    borderRadius: 4,
    marginBottom: 10,
  },
  jsonData: {
    marginTop: 8,
    padding: 8,
    backgroundColor: light.surfaceMuted,
    borderRadius: 4,
  },
  infoBox: {
    padding: 8,
    backgroundColor: light.surfaceMuted,
    borderRadius: 4,
    marginVertical: 8,
  },
  subsectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

export default DevMenu;
