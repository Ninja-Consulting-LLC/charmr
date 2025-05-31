import React, {useEffect, useState} from 'react';
import {
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
import {submitSupportRequest} from '../services/api';
import {useStore} from '../store/StoreProvider';
import {theme} from '../theme/theme';
import LoginModal from './LoginModal';

interface SupportContactModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const SupportContactModal: React.FC<SupportContactModalProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const {user, userId, authBypass} = useStore();
  const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
  const [email, setEmail] = useState(
    isDevelopment ? 'ninjaconsultingllc@gmail.com' : user.email || '',
  );
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(
    isDevelopment
      ? 'This is a test support request from local development.'
      : '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Update email when user state changes (only if not in dev mode)
  useEffect(() => {
    if (user.email && !isDevelopment) {
      setEmail(user.email);
    }
  }, [user.email]);

  // Reset form state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setIsSuccess(false);
      setError(null);
      setIsSubmitting(false);
      setPhone('');
      setMessage(
        isDevelopment
          ? 'This is a test support request from local development.'
          : '',
      );
      setEmail(
        isDevelopment ? 'ninjaconsultingllc@gmail.com' : user.email || '',
      );
    }
  }, [visible, user.email]);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!message) {
      setError('Message is required');
      return;
    }

    if (!userId && !authBypass) {
      setError(
        'Please register an account to contact support. This helps us better assist you with your inquiry.',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitSupportRequest(
        {
          userId: userId || 'dev-user',
          email,
          phone,
          message,
          plan: user.plan,
          dailyMessagesUsed: user.dailyMessagesUsed,
          dailyMessageLimit: user.dailyMessageLimit,
          extraMessages: user.extraMessages,
        },
        authBypass,
      );
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting support request:', err);
      const error = err as Error;
      if (error.message === 'User not authenticated' && !authBypass) {
        setError(
          'Please register an account to contact support. This helps us better assist you with your inquiry.',
        );
      } else {
        setError('Failed to submit support request. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const handleRegisterPress = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // Don't dismiss the support modal, let the user continue with their request
  };

  if (!visible) return null;

  return (
    <>
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
                {backgroundColor: theme.colors.surface},
              ]}>
              <View style={styles.header}>
                <Text variant="headlineSmall">
                  {isSuccess ? 'Message Sent' : 'Contact Support'}
                </Text>
                <IconButton icon="close" onPress={onDismiss} />
              </View>

              <View style={styles.content}>
                {isSuccess ? (
                  <View style={styles.successContainer}>
                    <Text variant="bodyLarge" style={styles.successMessage}>
                      Your support request has been sent successfully. We'll get
                      back to you soon!
                    </Text>
                    <Button
                      mode="contained"
                      onPress={onDismiss}
                      style={styles.button}>
                      Close
                    </Button>
                  </View>
                ) : (
                  <>
                    {error && (
                      <View style={styles.errorContainer}>
                        <Text
                          style={[styles.error, {color: theme.colors.error}]}>
                          {error}
                        </Text>
                        {error.includes('register') && (
                          <Button
                            mode="text"
                            onPress={handleRegisterPress}
                            style={styles.registerButton}>
                            Register Now
                          </Button>
                        )}
                      </View>
                    )}

                    <TextInput
                      label="Email *"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      disabled={!!user.email}
                      testID="email-input"
                    />

                    <TextInput
                      label="Phone (optional)"
                      value={phone}
                      onChangeText={setPhone}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="phone-pad"
                      testID="phone-input"
                    />

                    <TextInput
                      label="Message *"
                      value={message}
                      onChangeText={setMessage}
                      mode="outlined"
                      style={styles.messageInput}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      testID="message-input"
                    />

                    <Button
                      mode="contained"
                      onPress={handleSubmit}
                      style={styles.button}
                      loading={isSubmitting}
                      disabled={isSubmitting || !email || !message}
                      testID="send-message-button">
                      Send Message
                    </Button>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
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
    borderRadius: theme.roundness,
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
    borderBottomColor: theme.colors.outline,
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
  errorContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  error: {
    textAlign: 'center',
    marginBottom: 8,
  },
  registerButton: {
    marginTop: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default SupportContactModal;
