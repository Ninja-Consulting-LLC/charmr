import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {Divider, IconButton, List, useTheme} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {getMatches, Match, restoreMatch} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import HiddenMatchesModal from './HiddenMatchesModal';
import MessagePackModal from './MessagePackModal';
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
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHiddenMatchesModal, setShowHiddenMatchesModal] = useState(false);
  const [hiddenMatches, setHiddenMatches] = useState<Match[]>([]);
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

  const loadHiddenMatches = async () => {
    const allMatches = await getMatches(true);
    const hidden = allMatches.filter(match => match.hidden);
    setHiddenMatches(hidden);
  };

  const handleRestoreMatch = async (match: Match) => {
    await restoreMatch(match.name, match.platform);
    await loadHiddenMatches();
    onMatchesUpdated?.();
  };

  const handleOpenHiddenMatches = async () => {
    await loadHiddenMatches();
    setShowHiddenMatchesModal(true);
  };

  const handleSignOut = async () => {
    // Clear user data with correct plan limits
    setUser({
      id: '',
      plan: SubscriptionTier.FREE,
      dailyMessagesUsed: 0,
      extraMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
    });
    setIsAuthenticated(false);
    onDismiss();
    navigation.navigate('Login');
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
            backgroundColor: theme.colors.surface,
            transform: [{translateX: slideAnim}],
          },
        ]}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            style={styles.closeButton}
          />
        </View>
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title={user.email || 'Guest'}
            description={`Plan: ${user.plan}`}
            left={props => <List.Icon {...props} icon="account" />}
          />
          <Divider />
          <List.Subheader>Message Limits</List.Subheader>
          <List.Item
            title="Daily Messages"
            description={`${
              user.dailyMessagesUsed
            }/${user.getDailyMessageLimit()} used`}
            left={props => <List.Icon {...props} icon="message" />}
          />
          <List.Item
            title="Extra Messages"
            description={`${user.extraMessages} remaining`}
            left={props => <List.Icon {...props} icon="gift" />}
          />
          <Divider />
          <List.Subheader>Matches</List.Subheader>
          <List.Item
            title="Hidden Matches"
            left={props => <List.Icon {...props} icon="archive" />}
            onPress={handleOpenHiddenMatches}
          />
          <Divider />
          <List.Subheader>Support</List.Subheader>
          <List.Item
            title="Contact Support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            onPress={onOpenSupport}
          />
          <Divider />
          <List.Subheader>Upgrade & Purchases</List.Subheader>
          <List.Item
            title="Buy Message Pack"
            left={props => <List.Icon {...props} icon="gift" />}
            onPress={() => setShowMessagePackModal(true)}
          />
          <List.Item
            title="Upgrade Plan"
            left={props => <List.Icon {...props} icon="star" />}
            onPress={() => setShowUpgradeModal(true)}
          />
          <Divider />
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => navigation.navigate('Terms')}
          />
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield-account" />}
            onPress={() => navigation.navigate('Privacy')}
          />
          {isAuthenticated && (
            <List.Item
              title="Sign Out"
              left={props => <List.Icon {...props} icon="logout" />}
              onPress={handleSignOut}
            />
          )}
        </List.Section>
      </Animated.View>

      <MessagePackModal
        visible={showMessagePackModal}
        onDismiss={() => setShowMessagePackModal(false)}
        currentBalance={user.extraMessages}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />

      <HiddenMatchesModal
        visible={showHiddenMatchesModal}
        onDismiss={() => setShowHiddenMatchesModal(false)}
        hiddenMatches={hiddenMatches}
        onRestoreMatch={handleRestoreMatch}
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
});

export default UserMenuSlideout;
