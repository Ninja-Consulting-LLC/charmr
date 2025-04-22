import React, {useState} from 'react';
import {Animated, Dimensions, Linking, StyleSheet, View} from 'react-native';
import {Button, IconButton, Text, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../store';

interface UserMenuSlideoutProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSupport: () => void;
}

const {width} = Dimensions.get('window');

const UserMenuSlideout: React.FC<UserMenuSlideoutProps> = ({
  visible,
  onDismiss,
  onOpenSupport,
}) => {
  const theme = useTheme();
  const {user} = useStore();
  const [slideAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const handleSignOut = () => {
    // TODO: Implement sign out
    console.log('Sign out pressed');
  };

  const handleLogin = () => {
    // TODO: Implement login
    console.log('Login pressed');
  };

  const handleUpgrade = () => {
    // TODO: Navigate to UpgradeScreen
    console.log('Upgrade pressed');
  };

  const handleBuyMessages = () => {
    // TODO: Open MessagePackModal
    console.log('Buy messages pressed');
  };

  const openTerms = () => {
    Linking.openURL('https://charmr.app/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://charmr.app/privacy');
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );

  const getPlanName = () => {
    switch (user.plan) {
      case 'free':
        return 'Free';
      case 'plus':
        return 'Charmr Plus';
      case 'premium':
        return 'Charmr Premium';
      default:
        return 'Free';
    }
  };

  const slideoutStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [width, 0],
        }),
      },
    ],
  };

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: slideAnim,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          ]}
          onTouchEnd={onDismiss}
        />
      )}

      {/* Slideout Panel */}
      <Animated.View
        style={[
          styles.slideout,
          slideoutStyle,
          {backgroundColor: theme.colors.background},
        ]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text variant="headlineSmall">Account</Text>
            <IconButton icon="close" onPress={onDismiss} />
          </View>

          <View style={styles.content}>
            {renderSection(
              'Account',
              <View>
                <Text variant="bodyLarge">{user.email || 'Not signed in'}</Text>
                {__DEV__ ? (
                  <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    style={styles.button}>
                    Sign Out
                  </Button>
                ) : user.email ? (
                  <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    style={styles.button}>
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    style={styles.button}>
                    Sign In
                  </Button>
                )}
              </View>,
            )}

            {renderSection(
              'Current Plan',
              <View>
                <Text variant="bodyLarge">{getPlanName()}</Text>
                <Text variant="bodyMedium">
                  {user.dailyMessagesUsed} / {user.dailyMessageLimit} messages
                  used today
                </Text>
                {user.extraMessages > 0 && (
                  <Text variant="bodyMedium">
                    You have {user.extraMessages} extra messages
                  </Text>
                )}
              </View>,
            )}

            {renderSection(
              'Upgrade Options',
              <View>
                <Button
                  mode="contained"
                  onPress={handleUpgrade}
                  style={styles.button}>
                  Upgrade to Premium
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleBuyMessages}
                  style={styles.button}>
                  Buy More Messages
                </Button>
              </View>,
            )}

            {renderSection(
              'Support',
              <View>
                <Button
                  mode="text"
                  onPress={onOpenSupport}
                  style={styles.button}>
                  Contact Support
                </Button>
                <Button mode="text" onPress={openTerms} style={styles.button}>
                  Terms of Service
                </Button>
                <Button mode="text" onPress={openPrivacy} style={styles.button}>
                  Privacy Policy
                </Button>
              </View>,
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  slideout: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
});

export default UserMenuSlideout;
