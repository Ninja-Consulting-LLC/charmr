import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Animated, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Divider, IconButton, List, useTheme} from 'react-native-paper';
import {signOut} from '../config/firebase';
import {RootStackParamList} from '../navigation/types';
import {clearAuthData} from '../services/authService';
import axiosInstance from '../services/axiosInstance';
import {deleteMatch, restoreMatch} from '../services/matchService';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import HiddenMatchesModal from './HiddenMatchesModal';
import LoginModal from './LoginModal';
import SubscriptionSlideout from './SubscriptionSlideout';
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
  const {user, setUser, isAuthenticated, setIsAuthenticated} = useStore();
  console.log('UserMenuSlideout user:', user); // DEBUG LOG
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showArchivedMatchesModal, setShowArchivedMatchesModal] =
    useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionSlideout, setShowSubscriptionSlideout] =
    useState(false);
  const [archivedMatches, setArchivedMatches] = useState<Match[]>([]);
  const [isVisible, setIsVisible] = useState(false);
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

  if (!isVisible && !visible) return null;

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
              Hi {user.name}
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
                  : `${
                      user.dailyMessagesUsed
                    }/${user.getDailyMessageLimit()} used`
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
                    icon="login"
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
            <List.Item
              title="Manage Subscription"
              left={props => (
                <List.Icon {...props} icon="cog" color={theme.colors.surface} />
              )}
              right={props => (
                <List.Icon
                  {...props}
                  icon="chevron-right"
                  color={theme.colors.surface}
                />
              )}
              onPress={() => setShowSubscriptionSlideout(true)}
              titleStyle={{color: theme.colors.surface}}
            />
            {user.plan !== SubscriptionTier.PRO && (
              <List.Item
                title="Upgrade Plan"
                left={props => (
                  <List.Icon
                    {...props}
                    icon="star"
                    color={theme.colors.surface}
                  />
                )}
                onPress={() => setShowUpgradeModal(true)}
                titleStyle={{color: theme.colors.surface}}
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
                onPress={() => navigation.navigate('Terms')}
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
                onPress={() => navigation.navigate('Privacy')}
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

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />

      <HiddenMatchesModal
        visible={showArchivedMatchesModal}
        onDismiss={() => setShowArchivedMatchesModal(false)}
        hiddenMatches={archivedMatches}
        onRestoreMatch={handleRestoreMatch}
        onDeleteMatch={handleDeleteMatch}
      />

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          navigation.navigate('Home');
        }}
      />

      <SubscriptionSlideout
        visible={showSubscriptionSlideout}
        onDismiss={() => setShowSubscriptionSlideout(false)}
      />
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
});

export default UserMenuSlideout;
