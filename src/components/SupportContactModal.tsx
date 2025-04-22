import React, {useEffect, useState} from 'react';
import {Linking, Modal, StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {useStore} from '../store';

interface SupportContactModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const SupportContactModal: React.FC<SupportContactModalProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const {user, userId} = useStore();
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update email when user state changes
  useEffect(() => {
    if (user.email) {
      setEmail(user.email);
    }
  }, [user.email]);

  const handleSubmit = async () => {
    if (!email) {
      // TODO: Show error message
      return;
    }

    setIsSubmitting(true);
    try {
      const supportEmail = 'ninjaconsultingllc@gmail.com';
      const subject = 'Support Request from Charmr App';
      const body = `
User Information:
- User ID: ${userId}
- Email: ${email}
- Phone: ${phone || 'Not provided'}
- Current Plan: ${user.plan}
- Daily Messages Used: ${user.dailyMessagesUsed}/${user.dailyMessageLimit}
- Extra Messages: ${user.extraMessages}

Message:
${message}
      `.trim();

      const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;

      // Open email client
      await Linking.openURL(mailtoLink);
      onDismiss();
    } catch (error) {
      console.error('Error sending support request:', error);
      // TODO: Show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {backgroundColor: theme.colors.background},
          ]}>
          <View style={styles.header}>
            <Text variant="headlineSmall">Contact Support</Text>
            <IconButton icon="close" onPress={onDismiss} />
          </View>

          <View style={styles.content}>
            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              disabled={!!user.email}
            />

            <TextInput
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              mode="outlined"
              style={styles.messageInput}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
              loading={isSubmitting}
              disabled={isSubmitting || !email}>
              Send Message
            </Button>
          </View>
        </View>
      </View>
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
    maxHeight: '80%',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
  },
  messageInput: {
    marginBottom: 16,
    minHeight: 120,
  },
  button: {
    marginTop: 8,
  },
});

export default SupportContactModal;
