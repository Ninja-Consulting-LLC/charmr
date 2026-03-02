import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Button,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { updateUserProfile } from '../services/userService';
import { useStore } from '../store';
import { logger } from '../utils/logger';

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
  const { user, setUser } = useStore();
  const theme = useTheme();

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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <IconButton icon="close" onPress={onDismiss} />
            </View>

            <View style={styles.content}>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
                disabled={isLoading}
                testID="name-input"
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading}
                testID="email-input"
              />

              <Button
                mode="contained"
                onPress={handleSave}
                disabled={isLoading}
                style={styles.button}
                loading={isLoading}
                testID="save-button">
                Save
              </Button>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 8,
  },
});

export default EditUserDetailsModal;