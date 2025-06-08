import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Divider, IconButton, List, Portal, useTheme } from 'react-native-paper';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { signOut } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { clearAuthData } from '../services/authService';
import axiosInstance from '../services/axiosInstance';
import { deleteMatch, restoreMatch } from '../services/matchService';
import { cancelSubscription, syncSubscriptionState } from '../services/revenueCatService';
import { updateUserPlan } from '../services/userService';
import { useStore } from '../store';
import { SubscriptionTier } from '../types/enums';
import { logger } from '../utils/logger';
import { Match } from '../utils/matchUtils';
import { getPlanLimits } from '../utils/planLimits';
import HiddenMatchesModal from './HiddenMatchesModal';
import LoginModal from './LoginModal';
import PurchaseSuccessModal from './PurchaseSuccessModal';
import UpgradeModal from './UpgradeModal';

interface UserMenuSlideoutProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSupport: () => void;
  onMatchesUpdated?: () => void;
}

const UserMenuSlideout: React.FC<UserMenuSlideoutProps> = ({
  visible,
  onDismiss,
  onOpenSupport,
  onMatchesUpdated,
}) => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user, setUser, isAuthenticated, setIsAuthenticated, handleGoogleLogin} = useStore();
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPresetPaywall, setShowPresetPaywall] = useState(false);
  const [showArchivedMatchesModal, setShowArchivedMatchesModal] =
    useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionSection, setShowSubscriptionSection] = useState(false);
  const [archivedMatches, setArchivedMatches] = useState<Match[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(400)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    logger.auth.info('UserMenuSlideout mounted with handleGoogleLogin:', {
      hasHandleGoogleLogin: !!handleGoogleLogin,
      isAuthenticated,
      userId: user?.id,
    });
  }, [handleGoogleLogin, isAuthenticated, user?.id]);

  const loadArchivedMatches = async () => {
    if (!user.id) {
      console.error('No user ID available');
      return;
    }
    try {
      const response = await axiosInstance.get(
        `/api/users/${user.id}/matches`,
        {
          params: {includeHidden: true},
        },
      );
      const matchesArray = Array.isArray(response.data)
        ? response.data
        : (Object.values(response.data) as Match[]);
      const archived = matchesArray.filter((match: Match) => match.hidden);
      setArchivedMatches(archived);
    } catch (error) {
      console.error('Error loading archived matches:', error);
    }
  };

  const handleRestoreMatch = async (match: Match) => {
    await restoreMatch(match.id);
    await loadArchivedMatches();
    onMatchesUpdated?.();
  };

  const handleDeleteMatch = async (match: Match) => {
    try {
      await deleteMatch(String(match.id));
      await loadArchivedMatches();
      onMatchesUpdated?.();
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  const handleOpenArchivedMatches = async () => {
    await loadArchivedMatches();
    setShowArchivedMatchesModal(true);
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Firebase
      await signOut();

      // Clear all auth-related data
      await clearAuthData();

      // Clear user data with correct plan limits
      setUser({
        id: '',
        plan: SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
        email: '',
        name: '',
        installationId: '',
      });
      setIsAuthenticated(false);

      onDismiss();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    setUser({
      ...user,
      plan: tier,
      getDailyMessageLimit: () => getPlanLimits(tier),
    });
    setShowUpgradeModal(false);
  };

  const handleUpgradePress = async () => {
    try {
      console.log('[UserMenuSlideout] Checking RevenueCat offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[UserMenuSlideout] Offerings:', {
        hasCurrent: !!offerings.current,
        currentOffering: offerings.current?.identifier,
        availablePackages: offerings.current?.availablePackages?.length || 0,
      });

      if (offerings.current) {
        console.log('[UserMenuSlideout] Setting showPresetPaywall to true');
        setShowUpgradeModal(false);
        setShowPresetPaywall(true);
      } else {
        console.log('[UserMenuSlideout] No current offering, showing custom modal');
        setShowPresetPaywall(false);
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('[UserMenuSlideout] Error checking offerings:', error);
      setShowPresetPaywall(false);
      setShowUpgradeModal(true);
    }
  };

  const handlePurchaseSuccess = () => {
    setShowPresetPaywall(false);
    setShowUpgradeModal(false);
    if (user) {
      // Immediately update the user's plan state
      setUser({
        ...user,
        plan: SubscriptionTier.PRO,
        getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.PRO),
      });
      // Then sync with the backend
      syncSubscriptionState(updateUserPlan, setUser, user).catch(error => {
        logger.revenueCat.error('Failed to sync subscription state:', error);
      });
    }
    setShowPurchaseSuccess(true);
    if (user?.email === user?.installationId) {
      setShowRegistrationPrompt(true);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await cancelSubscription();
      if (result === 'SANDBOX') {
        Alert.alert(
          'Sandbox Subscription',
          'This is a sandbox subscription. To manage it:\n\n1. Go to RevenueCat dashboard\n2. Navigate to Customers\n3. Find your test user\n4. Use the sandbox testing tools to manage the subscription',
          [{text: 'OK'}],
        );
      } else if (result) {
        await Linking.openURL(result);
      } else {
        Alert.alert(
          'Subscription Management',
          'Unable to open subscription management. Please try again later or contact support if the issue persists.',
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      logger.revenueCat.error(
        'Failed to open subscription management:',
        error,
      );
      Alert.alert(
        'Error',
        'Unable to open subscription management. Please try again later.',
        [{text: 'OK'}],
      );
    }
  };

  if (!isVisible && !visible) return null;

  const userPlan = user?.plan || SubscriptionTier.FREE;
  const dailyMessagesUsed = user?.dailyMessagesUsed || 0;
  const dailyMessageLimit = user?.getDailyMessageLimit?.() || getPlanLimits(userPlan);

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
        onTouchEnd={onDismiss}
      />
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.colors.primary,
            transform: [{translateX: slideAnim}],
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.planText, {color: theme.colors.surface}]}>
              Account Settings
            </Text>
          </View>
          <View style={styles.headerRight}>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
              iconColor={theme.colors.surface}
            />
          </View>
        </View>
        <ScrollView style={styles.scrollView}>
          <List.Section>
            {user.email && user.email !== user.installationId ? (
              <List.Item
                title={user.name || 'Guest'}
                description={user.email}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="account"
                    color={theme.colors.surface}
                  />
                )}
                titleStyle={{color: theme.colors.surface}}
                descriptionStyle={{color: theme.colors.surface}}
              />
            ) : null}
            <Divider style={{backgroundColor: theme.colors.surface}} />
            <List.Item
              title="Daily Messages"
              description={
                user.plan === SubscriptionTier.PRO
                  ? 'Unlimited'
                  : `${user.dailyMessagesUsed}/${(
                      user.getDailyMessageLimit ||
                      (() => getPlanLimits(user.plan))
                    )()} used`
              }
              left={props => (
                <List.Icon
                  {...props}
                  icon="message"
                  color={theme.colors.surface}
                />
              )}
              titleStyle={{color: theme.colors.surface}}
              descriptionStyle={{color: theme.colors.surface}}
            />
            <Divider style={{backgroundColor: theme.colors.surface}} />
            {!user.email || user.email === user.installationId ? (
              <List.Item
                title="Register"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="account-plus"
                    color={theme.colors.surface}
                  />
                )}
                onPress={() => setShowLoginModal(true)}
                titleStyle={{color: theme.colors.surface}}
              />
            ) : null}
            <List.Item
              title="Archived Matches"
              left={props => (
                <List.Icon
                  {...props}
                  icon="archive"
                  color={theme.colors.surface}
                />
              )}
              onPress={handleOpenArchivedMatches}
              titleStyle={{color: theme.colors.surface}}
            />
            <Divider style={{backgroundColor: theme.colors.surface}} />
            <List.Item
              title="Contact Support"
              left={props => (
                <List.Icon
                  {...props}
                  icon="help-circle"
                  color={theme.colors.surface}
                />
              )}
              onPress={onOpenSupport}
              titleStyle={{color: theme.colors.surface}}
            />
            <Divider style={{backgroundColor: theme.colors.surface}} />
            {userPlan === SubscriptionTier.PRO ? (
              <>
                <List.Item
                  title="Subscription"
                  description={`${userPlan}`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="card-account-details"
                      color={theme.colors.surface}
                    />
                  )}
                  right={props => (
                    <List.Icon
                      {...props}
                      icon={showSubscriptionSection ? "chevron-up" : "chevron-down"}
                      color={theme.colors.surface}
                    />
                  )}
                  onPress={() => setShowSubscriptionSection(!showSubscriptionSection)}
                  titleStyle={{color: theme.colors.surface}}
                  descriptionStyle={{color: theme.colors.surface}}
                />
                {showSubscriptionSection && (
                  <List.Item
                    title="Cancel Subscription"
                    description={
                      __DEV__
                        ? 'Sandbox: Use RevenueCat dashboard to manage'
                        : undefined
                    }
                    left={props => (
                      <List.Icon
                        {...props}
                        icon="cancel"
                        color={theme.colors.surface}
                      />
                    )}
                    onPress={handleManageSubscription}
                    titleStyle={{color: theme.colors.surface}}
                    descriptionStyle={{color: theme.colors.surface}}
                  />
                )}
              </>
            ) : (
              <List.Item
                title="Subscription"
                description={`${userPlan} Plan`}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="card-account-details"
                    color={theme.colors.surface}
                  />
                )}
                titleStyle={{color: theme.colors.surface}}
                descriptionStyle={{color: theme.colors.surface}}
              />
            )}
            {userPlan !== SubscriptionTier.PRO && (
              <List.Item
                title="Upgrade Plan"
                description="Get unlimited messages and more features"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="star"
                    color={theme.colors.surface}
                  />
                )}
                onPress={handleUpgradePress}
                titleStyle={{color: theme.colors.surface}}
                descriptionStyle={{color: theme.colors.surface}}
              />
            )}
            <Divider style={{backgroundColor: theme.colors.surface}} />
            <View style={styles.legalSection}>
              <List.Item
                title="Terms of Service"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="file-document"
                    color={theme.colors.surface}
                  />
                )}
                onPress={() => Linking.openURL('https://example.invalid/terms.html')}
                titleStyle={[styles.legalText, {color: theme.colors.surface}]}
              />
              <List.Item
                title="Privacy Policy"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="shield-account"
                    color={theme.colors.surface}
                  />
                )}
                onPress={() => Linking.openURL('https://example.invalid/privacy.html')}
                titleStyle={[styles.legalText, {color: theme.colors.surface}]}
              />
            </View>
            {isAuthenticated && (
              <>
                <Divider style={{backgroundColor: theme.colors.surface}} />
                <List.Item
                  title="Logout"
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="logout"
                      color={theme.colors.surface}
                    />
                  )}
                  onPress={handleSignOut}
                  titleStyle={{color: theme.colors.surface}}
                />
              </>
            )}
          </List.Section>
        </ScrollView>
      </Animated.View>

      {/* <MessagePackModal
        visible={showMessagePackModal}
        onDismiss={() => setShowMessagePackModal(false)}
        currentBalance={user.extraMessages}
      /> */}

      <Portal>
        <UpgradeModal
          visible={showUpgradeModal}
          onDismiss={() => setShowUpgradeModal(false)}
          onUpgrade={handleUpgrade}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
        <LoginModal
          visible={showLoginModal}
          onClose={() => {
            logger.auth.info('LoginModal closed');
            setShowLoginModal(false);
          }}
          onLoginSuccess={() => {
            logger.auth.info('Login successful, navigating to Home');
            setShowLoginModal(false);
            navigation.navigate('Home');
          }}
          onLoadingChange={(loading) => {
            logger.auth.info('Login loading state changed:', { loading });
            setIsLoading(loading);
          }}
          handleGoogleLogin={handleGoogleLogin}
        />
        <HiddenMatchesModal
          visible={showArchivedMatchesModal}
          onDismiss={() => setShowArchivedMatchesModal(false)}
          hiddenMatches={archivedMatches}
          onRestoreMatch={handleRestoreMatch}
          onDeleteMatch={handleDeleteMatch}
        />
        <PurchaseSuccessModal
          visible={showPurchaseSuccess}
          onDismiss={() => {
            setShowPurchaseSuccess(false);
            setShowRegistrationPrompt(false);
          }}
          showRegistrationPrompt={showRegistrationPrompt}
          onRegisterPress={() => {
            setShowPurchaseSuccess(false);
            setShowLoginModal(true);
          }}
        />
        {showPresetPaywall && (
          <RevenueCatUI.Paywall
            onDismiss={() => setShowPresetPaywall(false)}
            onPurchaseCompleted={() => {
              handlePurchaseSuccess();
            }}
          />
        )}
      </Portal>

      {isLoading && (
        <View style={[styles.overlay, {backgroundColor: 'rgba(0, 0, 0, 0.7)'}]}>
          <ActivityIndicator size="large" color={theme.colors.surface} />
          <Text style={[styles.loadingText, {color: theme.colors.surface}]}>
            Signing in...
          </Text>
        </View>
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flex: 1,
    paddingLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    margin: 0,
  },
  closeButton: {
    margin: 0,
  },
  planText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  legalSection: {
    marginTop: 8,
  },
  legalText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  listItemContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTextContainer: {
    marginLeft: 32,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listItemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  registerText: {
    fontSize: 16,
    marginLeft: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UserMenuSlideout;
