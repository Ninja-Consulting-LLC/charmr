import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import {useStore} from '../store';

interface UserMenuModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const UserMenuModal: React.FC<UserMenuModalProps> = ({visible, onDismiss}) => {
  const theme = useTheme();
  const {user} = useStore();

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

  const handleBillingSupport = () => {
    // TODO: Open support link
    console.log('Billing support pressed');
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

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.background},
        ]}>
        <View style={styles.header}>
          <Text variant="headlineSmall">Account</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

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
              {user.dailyMessagesUsed} / {user.dailyMessageLimit} messages used
              today
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
              onPress={handleBillingSupport}
              style={styles.button}>
              Billing Questions?
            </Button>
            <Button mode="text" onPress={openTerms} style={styles.button}>
              Terms of Service
            </Button>
            <Button mode="text" onPress={openPrivacy} style={styles.button}>
              Privacy Policy
            </Button>
          </View>,
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default UserMenuModal;
