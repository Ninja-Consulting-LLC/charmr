import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Divider, IconButton, List, useTheme} from 'react-native-paper';
import {
  cancelSubscription,
  syncSubscriptionState,
} from '../services/revenueCatService';
import {updateUserPlan} from '../services/userService';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import UpgradeModal from './UpgradeModal';

interface SubscriptionSlideoutProps {
  visible: boolean;
  onDismiss: () => void;
}

const SubscriptionSlideout: React.FC<SubscriptionSlideoutProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const {user, setUser} = useStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      syncSubscriptionState(updateUserPlan, setUser, user).catch(error => {
        logger.revenueCat.error('Failed to sync subscription state:', error);
      });
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
  }, [visible, slideAnim, fadeAnim, user, setUser]);

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
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={onDismiss}
            style={styles.closeButton}
            iconColor={theme.colors.surface}
          />
          <Text style={[styles.headerTitle, {color: theme.colors.surface}]}>
            Manage Subscription
          </Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <List.Section>
            <List.Item
              title={user.plan || SubscriptionTier.FREE}
              description={`${
                user.dailyMessagesUsed
              }/${user.getDailyMessageLimit()} messages used today`}
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
            {user.plan === SubscriptionTier.PRO ? (
              <>
                <Divider style={{backgroundColor: theme.colors.surface}} />
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
                  onPress={async () => {
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
                  }}
                  titleStyle={{color: theme.colors.surface}}
                  descriptionStyle={{color: theme.colors.surface}}
                />
              </>
            ) : (
              <>
                <Divider style={{backgroundColor: theme.colors.surface}} />
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
                  onPress={() => setShowUpgradeModal(true)}
                  titleStyle={{color: theme.colors.surface}}
                  descriptionStyle={{color: theme.colors.surface}}
                />
              </>
            )}
          </List.Section>
        </ScrollView>
      </Animated.View>

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 8,
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
});

export default SubscriptionSlideout;
