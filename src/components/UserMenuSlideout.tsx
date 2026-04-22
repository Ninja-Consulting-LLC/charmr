import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Divider, List, Portal} from 'react-native-paper';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import {signOut} from '../config/firebase';
import {RootStackParamList} from '../navigation/types';
import {clearAuthData} from '../services/authService';
import axiosInstance from '../services/axiosInstance';
import {deleteMatch, restoreMatch} from '../services/matchService';
import {
  cancelSubscription,
  syncSubscriptionState,
} from '../services/revenueCatService';
import {deleteUserAccount, updateUserPlan} from '../services/userService';
import {AppText, ModalIconButton, tokens} from '../design-system';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import DeleteAccountModal from './DeleteAccountModal';
import EditUserDetailsModal from './EditUserDetailsModal';
import HiddenMatchesModal from './HiddenMatchesModal';
import LoginModal from './LoginModal';
import PurchaseSuccessModal from './PurchaseSuccessModal';
import UpgradeModal from './UpgradeModal';

interface UserMenuSlideoutProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSupport: () => void;
  onMatchesUpdated?: () => void | Promise<void>;
}

const UserMenuSlideout: React.FC<UserMenuSlideoutProps> = ({
  visible,
  onDismiss,
  onOpenSupport,
  onMatchesUpdated,
}) => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    handleProviderLogin,
  } = useStore();
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPresetPaywall, setShowPresetPaywall] = useState(false);
  const [showArchivedMatchesModal, setShowArchivedMatchesModal] =
    useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showSubscriptionSection, setShowSubscriptionSection] = useState(false);
  const [archivedMatches, setArchivedMatches] = useState<Match[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
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
    // Load archived matches when component mounts
    loadArchivedMatches();
  }, []);

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
    await onMatchesUpdated?.();
  };

  const handleDeleteMatch = async (match: Match) => {
    try {
      await deleteMatch(String(match.id));
      await loadArchivedMatches();
      await onMatchesUpdated?.();
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
        createdAt: new Date().toISOString(),
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
        console.log(
          '[UserMenuSlideout] No current offering, showing custom modal',
        );
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
      // Then sync with the backend, forcing sync after purchase
      syncSubscriptionState(updateUserPlan, setUser, user, true).catch(
        error => {
          logger.revenueCat.error('Failed to sync subscription state:', error);
        },
      );
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
      logger.revenueCat.error('Failed to open subscription management:', error);
      Alert.alert(
        'Error',
        'Unable to open subscription management. Please try again later.',
        [{text: 'OK'}],
      );
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user.id) {
        Alert.alert('Error', 'No user ID available');
        return;
      }

      await deleteUserAccount(user.id);

      // Sign out after successful deletion
      await handleSignOut();

      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted. You can restore it by logging in with the same email address.',
        [{text: 'OK'}],
      );
    } catch (error) {
      logger.app.error('Failed to delete account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again later or contact support.',
        [{text: 'OK'}],
      );
    }
  };

  if (!isVisible && !visible) {return null;}

  const userPlan = user?.plan || SubscriptionTier.FREE;
  const dailyMessagesUsed = user?.dailyMessagesUsed || 0;
  const dailyMessageLimit =
    user?.getDailyMessageLimit?.() || getPlanLimits(userPlan);

  return (
    <>
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: tokens.color.overlay.heavy,
            opacity: fadeAnim,
          },
        ]}
        onTouchEnd={onDismiss}
      />
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: tokens.color.brand.primary,
            transform: [{translateX: slideAnim}],
          },
        ]}>
        <View style={[styles.header, {paddingTop: insets.top + 8}]}>
          <View style={styles.headerLeft}>
            <AppText variant="titleSm" color="hero" style={styles.planText}>
              Your account
            </AppText>
          </View>
          <View style={styles.headerRight}>
            <ModalIconButton
              testID="user-menu-close-button"
              icon="close"
              size={40}
              onPress={onDismiss}
              style={styles.closeButton}
              accessibilityLabel="Close account menu"
            />
          </View>
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <AppText variant="label" color="heroMuted">
                Plan
              </AppText>
              <AppText variant="bodyMedium" color="hero">
                {userPlan}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="label" color="heroMuted">
                Messages today
              </AppText>
              <AppText variant="bodyMedium" color="hero">
                {userPlan === SubscriptionTier.PRO
                  ? 'Unlimited'
                  : `${dailyMessagesUsed}/${dailyMessageLimit}`}
              </AppText>
            </View>
          </View>
          {/* User Profile Section */}
          <List.Section style={styles.sectionCard}>
            <List.Subheader
              style={[styles.subheader, {color: tokens.color.hero.text}]}>
              Profile
            </List.Subheader>
            {user.email && user.email !== user.installationId ? (
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <List.Icon icon="account" color={tokens.color.hero.text} />
                  <View style={styles.infoContent}>
                    <AppText
                      variant="bodyMedium"
                      color="hero"
                      style={styles.infoTitle}>
                      {user.name || 'Guest'}
                    </AppText>
                    <AppText
                      variant="body"
                      color="hero"
                      style={styles.infoDescription}>
                      {user.email}
                    </AppText>
                  </View>
                  {(!user.email ||
                    user.email === user.installationId ||
                    user.email.includes('privaterelay')) && (
                    <ModalIconButton
                      icon="pencil"
                      size={36}
                      onPress={() => setShowEditUserModal(true)}
                      accessibilityLabel="Edit profile"
                    />
                  )}
                </View>
                <Divider
                  style={[
                    styles.infoDivider,
                    {backgroundColor: tokens.color.hero.text},
                  ]}
                />
                <View style={styles.infoRow}>
                  <List.Icon icon="message" color={tokens.color.hero.text} />
                  <View style={styles.infoContent}>
                    <AppText variant="bodyMedium" color="hero" style={styles.infoTitle}>
                      Messages today
                    </AppText>
                    <AppText variant="body" color="hero" style={styles.infoDescription}>
                      {user.plan === SubscriptionTier.PRO
                        ? 'Unlimited'
                        : `${user.dailyMessagesUsed}/${(
                            user.getDailyMessageLimit ||
                            (() => getPlanLimits(user.plan))
                          )()} used`}
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <List.Item
                title="Create account"
                description="Sign in to save matches and settings"
                testID="user-menu-register-account"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="account-plus"
                    color={tokens.color.hero.text}
                  />
                )}
                onPress={() => setShowLoginModal(true)}
                titleStyle={{color: tokens.color.hero.text}}
                descriptionStyle={{color: tokens.color.hero.text}}
              />
            )}
          </List.Section>

          {/* App Features Section */}
          <List.Section style={styles.sectionCard}>
            <List.Subheader
              style={[styles.subheader, {color: tokens.color.hero.text}]}>
              In the app
            </List.Subheader>
            <List.Item
              title="Archived matches"
              testID="user-menu-archived-matches"
              left={props => (
                <List.Icon
                  {...props}
                  icon="archive"
                  color={tokens.color.hero.text}
                />
              )}
              onPress={handleOpenArchivedMatches}
              titleStyle={{color: tokens.color.hero.text}}
            />
            <List.Item
              title="Get help"
              testID="user-menu-contact-support"
              left={props => (
                <List.Icon
                  {...props}
                  icon="help-circle"
                  color={tokens.color.hero.text}
                />
              )}
              onPress={onOpenSupport}
              titleStyle={{color: tokens.color.hero.text}}
            />
          </List.Section>

          {/* Subscription Section */}
          <List.Section style={styles.sectionCard}>
            <List.Subheader
              style={[styles.subheader, {color: tokens.color.hero.text}]}>
              Subscription
            </List.Subheader>
            {userPlan === SubscriptionTier.PRO ? (
              <>
                <List.Item
                  title="Current Plan"
                  description={`${userPlan}`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="card-account-details"
                      color={tokens.color.hero.text}
                    />
                  )}
                  right={props => (
                    <List.Icon
                      {...props}
                      icon={
                        showSubscriptionSection ? 'chevron-up' : 'chevron-down'
                      }
                      color={tokens.color.hero.text}
                    />
                  )}
                  onPress={() =>
                    setShowSubscriptionSection(!showSubscriptionSection)
                  }
                  titleStyle={{color: tokens.color.hero.text}}
                  descriptionStyle={{color: tokens.color.hero.text}}
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
                        color={tokens.color.hero.text}
                      />
                    )}
                    onPress={handleManageSubscription}
                    titleStyle={{color: tokens.color.hero.text}}
                    descriptionStyle={{color: tokens.color.hero.text}}
                  />
                )}
              </>
            ) : (
              <>
                <List.Item
                  title="Current Plan"
                  description={`${userPlan}`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="card-account-details"
                      color={tokens.color.hero.text}
                    />
                  )}
                  titleStyle={{color: tokens.color.hero.text}}
                  descriptionStyle={{color: tokens.color.hero.text}}
                />
                <List.Item
                  title="Upgrade Plan"
                  description="Get unlimited messages and more features"
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="star"
                      color={tokens.color.hero.text}
                    />
                  )}
                  onPress={handleUpgradePress}
                  titleStyle={{color: tokens.color.hero.text}}
                  descriptionStyle={{color: tokens.color.hero.text}}
                />
              </>
            )}
          </List.Section>

          {/* Legal Section */}
          <List.Section style={styles.sectionCard}>
            <List.Subheader
              style={[styles.subheader, {color: tokens.color.hero.text}]}>
              Legal
            </List.Subheader>
            <List.Item
              testID="user-menu-terms-of-service"
              title="Terms of Service"
              left={props => (
                <List.Icon
                  {...props}
                  icon="file-document"
                  color={tokens.color.hero.text}
                />
              )}
              onPress={() =>
                Linking.openURL('https://charmrapp.com/terms.html')
              }
              titleStyle={[styles.legalText, {color: tokens.color.hero.text}]}
            />
            <List.Item
              testID="user-menu-privacy-policy"
              title="Privacy Policy"
              left={props => (
                <List.Icon
                  {...props}
                  icon="shield-account"
                  color={tokens.color.hero.text}
                />
              )}
              onPress={() =>
                Linking.openURL('https://charmrapp.com/privacy.html')
              }
              titleStyle={[styles.legalText, {color: tokens.color.hero.text}]}
            />
          </List.Section>

          {/* Account + session (logout kept separate from destructive account actions) */}
          {isAuthenticated && (
            <>
              <List.Section style={styles.sectionCard}>
                <List.Subheader
                  style={[styles.subheader, {color: tokens.color.hero.text}]}>
                  Account
                </List.Subheader>
                <List.Item
                  title="Delete Account"
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="delete"
                      color={tokens.color.hero.text}
                    />
                  )}
                  onPress={() => setShowDeleteAccountModal(true)}
                  titleStyle={{color: tokens.color.hero.text}}
                  descriptionStyle={{color: tokens.color.hero.text}}
                />
              </List.Section>
              <List.Section style={styles.sectionCard}>
                <List.Subheader
                  style={[styles.subheader, {color: tokens.color.hero.text}]}>
                  Session
                </List.Subheader>
                <List.Item
                  title="Logout"
                  left={props => (
                    <List.Icon
                      {...props}
                      icon="logout"
                      color={tokens.color.hero.text}
                    />
                  )}
                  onPress={handleSignOut}
                  titleStyle={{color: tokens.color.hero.text}}
                />
              </List.Section>
            </>
          )}
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
          onLoadingChange={loading => {
            logger.auth.info('Login loading state changed:', {loading});
            setIsLoading(loading);
          }}
          handleProviderLogin={handleProviderLogin}
        />
        <EditUserDetailsModal
          visible={showEditUserModal}
          onDismiss={() => setShowEditUserModal(false)}
        />
        <DeleteAccountModal
          visible={showDeleteAccountModal}
          onDismiss={() => setShowDeleteAccountModal(false)}
          onConfirm={handleDeleteAccount}
          isLoading={isLoading}
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
        <View style={[styles.overlay, {backgroundColor: tokens.color.overlay.scrim}]}>
          <ActivityIndicator size="large" color={tokens.color.hero.text} />
          <AppText variant="bodyMedium" color="hero" style={styles.loadingText}>
            Signing in...
          </AppText>
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
    paddingHorizontal: 8,
    paddingBottom: 8,
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
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.lg,
  },
  summaryCard: {
    marginTop: tokens.space.md,
    marginBottom: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
    gap: tokens.space.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCard: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.xs,
    borderRadius: tokens.radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    paddingVertical: tokens.space.xs,
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
  registerText: {
    fontSize: 16,
    marginLeft: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  clickableItem: {
    opacity: 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoItem: {
    opacity: 0.7,
    backgroundColor: 'transparent',
  },
  infoBox: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    margin: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  infoDivider: {
    marginVertical: 8,
    opacity: 0.2,
  },
  subheader: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  sectionDivider: {
    marginVertical: 8,
  },
});

export default UserMenuSlideout;
