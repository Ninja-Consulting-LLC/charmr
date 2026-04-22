import React, {useEffect, useState} from 'react';
import {Alert, Modal, StyleSheet, View} from 'react-native';
import {TextInput, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  RNModalTransparentOverlay,
  rnModalOverlay,
  tokens,
} from '../design-system';
import {updateUserProfile} from '../services/userService';
import {useStore} from '../store';
import {logger} from '../utils/logger';

interface EditUserDetailsModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const EditUserDetailsModal: React.FC<EditUserDetailsModalProps> = ({
  visible,
  onDismiss,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {user, setUser} = useStore();

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [visible, user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      const updatedUser = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
      });

      if (updatedUser) {
        setUser(updatedUser);
        onDismiss();
      }
    } catch (error) {
      logger.app.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) {return null;}

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <RNModalTransparentOverlay>
        <ModalSheet padded={false} style={rnModalOverlay.sheet}>
          <ThemeProvider theme={darkModalPaperTheme}>
            <View style={styles.header}>
              <AppText variant="titleSm" color="hero">
                Edit Profile
              </AppText>
              <ModalIconButton
                icon="close"
                size={40}
                onPress={onDismiss}
                accessibilityLabel="Close"
              />
            </View>

            <View style={styles.content}>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
                outlineStyle={styles.inputOutline}
                disabled={isLoading}
                testID="name-input"
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                outlineStyle={styles.inputOutline}
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading}
                testID="email-input"
              />

              <CharmrButton
                label="Save"
                variant="primary"
                onPress={handleSave}
                disabled={isLoading}
                loading={isLoading}
                testID="save-button"
                fullWidth
              />
            </View>
          </ThemeProvider>
        </ModalSheet>
      </RNModalTransparentOverlay>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border.subtle,
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  input: {
    backgroundColor: tokens.color.brand.primary,
    borderRadius: tokens.radii.paper,
  },
  inputOutline: {
    borderWidth: 1,
  },
});

export default EditUserDetailsModal;
