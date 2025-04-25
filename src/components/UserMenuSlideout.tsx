import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Animated, Linking, StyleSheet, Text, View} from 'react-native';
import {Button, Divider, IconButton, List, useTheme} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {getPlanLimits} from '../utils/planLimits';
import {MessagePackModal} from './MessagePackModal';
import UpgradeModal from './UpgradeModal';

interface UserMenuSlideoutProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSupport: () => void;
}

const UserMenuSlideout: React.FC<UserMenuSlideoutProps> = ({
  visible,
  onDismiss,
  onOpenSupport,
}) => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user, setUser, isAuthenticated, setIsAuthenticated} = useStore();
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleUpgrade = (plan: SubscriptionTier) => {
    setUser({
      plan,
      getDailyMessageLimit: () => getPlanLimits(plan),
    });
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
            } / ${user.getDailyMessageLimit()} used`}
            left={props => <List.Icon {...props} icon="message" />}
          />
          {user.extraMessages > 0 && (
            <List.Item
              title="Extra Messages"
              description={`${user.extraMessages} available`}
              left={props => <List.Icon {...props} icon="plus-circle" />}
            />
          )}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => setShowMessagePackModal(true)}
              style={styles.button}>
              Purchase Messages
            </Button>
            <Button
              mode="outlined"
              onPress={() => setShowUpgradeModal(true)}
              style={styles.button}>
              Upgrade Plan
            </Button>
          </View>
          <Divider />
          <List.Subheader>Support & Legal</List.Subheader>
          <List.Item
            title="Contact Support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            onPress={() => onOpenSupport()}
          />
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => handleOpenLink('https://charmr.ai/terms')}
          />
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield-lock" />}
            onPress={() => handleOpenLink('https://charmr.ai/privacy')}
          />
          <Divider />
          <List.Item
            title="Sign Out"
            left={props => <List.Icon {...props} icon="logout" />}
            onPress={handleSignOut}
          />
        </List.Section>
        <Text style={styles.planInfo}>
          {user.getDailyMessageLimit()} messages per day
        </Text>
      </Animated.View>

      <MessagePackModal
        visible={showMessagePackModal}
        onDismiss={() => setShowMessagePackModal(false)}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
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
  buttonContainer: {
    padding: 16,
  },
  button: {
    marginVertical: 8,
  },
  planInfo: {
    padding: 16,
    textAlign: 'center',
  },
});

export default UserMenuSlideout;
