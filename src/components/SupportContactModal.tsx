import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
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
import {submitSupportRequest} from '../services/api';
import {useStore} from '../store/StoreProvider';
import LoginModal from './LoginModal';

interface SupportContactModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode?: 'feedback' | 'support';
}

const SupportContactModal: React.FC<SupportContactModalProps> = ({
  visible,
  onDismiss,
  mode = 'support',
}) => {
  const {user, userId, authBypass} = useStore();
  const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
  const [email, setEmail] = useState(
    userId && user.email && !authBypass ? user.email : '',
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

  useEffect(() => {
    if (userId && user.email && !authBypass) {
      setEmail(user.email);
    }
  }, [user.email, userId, authBypass]);

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
        userId && user.email && !authBypass ? user.email : '',
      );
    }
  }, [visible, user.email, userId, authBypass]);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please add your email so we can reply.');
      return;
    }

    if (!message) {
      setError('Please write a short message.');
      return;
    }

    if (!userId && !authBypass) {
      setError(
        'Create a free account first so we can tie this to your profile and help faster.',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitSupportRequest(
        {
          userId: userId,
          email,
          phone,
          message,
          plan: user.plan,
          dailyMessagesUsed: user.dailyMessagesUsed,
          dailyMessageLimit: user.getDailyMessageLimit(),
          extraMessages: user.extraMessages,
          name: user.name,
        },
        authBypass,
      );
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting support request:', err);
      const e = err as Error;
      if (e.message === 'User not authenticated' && !authBypass) {
        setError(
          'Create a free account first so we can tie this to your profile and help faster.',
        );
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterPress = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}>
        <RNModalTransparentOverlay>
          <ModalSheet
            testID="support-contact-modal"
            padded={false}
            style={rnModalOverlay.sheet}>
            <ThemeProvider theme={darkModalPaperTheme}>
              <View style={styles.header}>
                    <AppText
                      testID="support-contact-title"
                      variant="titleSm"
                      color="hero"
                      accessibilityRole="header"
                      accessibilityLabel={
                        isSuccess
                          ? 'Message sent'
                          : mode === 'feedback'
                            ? 'Send feedback'
                            : 'Get help'
                      }>
                      {isSuccess
                        ? 'Message sent'
                        : mode === 'feedback'
                          ? 'Send feedback'
                          : 'Get help'}
                    </AppText>
                    <ModalIconButton
                      testID="support-contact-close"
                      icon="close"
                      size={40}
                      onPress={onDismiss}
                      accessibilityLabel="Close"
                    />
                  </View>

                <View style={styles.content}>
                  {isSuccess ? (
                    <View
                      testID="support-submit-success"
                      style={styles.successContainer}>
                      <AppText
                        testID="support-submit-success-text"
                        variant="body"
                        color="heroMuted"
                        style={styles.successMessage}>
                        Thanks — your{' '}
                        {mode === 'feedback' ? 'feedback' : 'message'} is on its
                        way. We will email you when we have an update.
                      </AppText>
                      <CharmrButton
                        testID="support-success-close-button"
                        label="Close"
                        variant="primary"
                        onPress={onDismiss}
                        fullWidth
                      />
                    </View>
                  ) : (
                    <>
                      {error && (
                        <View style={styles.errorContainer}>
                          <AppText
                            variant="bodyMedium"
                            color="danger"
                            style={styles.error}>
                            {error}
                          </AppText>
                          {error.toLowerCase().includes('account') && (
                            <CharmrButton
                              label="Create account"
                              variant="outline"
                              onPress={handleRegisterPress}
                              fullWidth
                            />
                          )}
                        </View>
                      )}

                      <TextInput
                        label="Email *"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={
                          !!(
                            authBypass ||
                            !userId ||
                            user.email === undefined ||
                            user.email === ''
                          )
                        }
                        testID="email-input"
                      />

                      <TextInput
                        label="Phone (optional)"
                        value={phone}
                        onChangeText={setPhone}
                        mode="outlined"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        keyboardType="phone-pad"
                        testID="phone-input"
                      />

                      <TextInput
                        label="Message *"
                        value={message}
                        onChangeText={setMessage}
                        mode="outlined"
                        style={styles.messageInput}
                        outlineStyle={styles.inputOutline}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        testID="message-input"
                      />

                      <CharmrButton
                        label="Send Message"
                        variant="primary"
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        disabled={isSubmitting || !email || !message}
                        testID="send-message-button"
                        fullWidth
                      />
                    </>
                  )}
                </View>
              </ThemeProvider>
            </ModalSheet>
        </RNModalTransparentOverlay>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border.subtle,
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  input: {
    marginBottom: 0,
    backgroundColor: tokens.color.brand.primary,
    borderRadius: tokens.radii.paper,
  },
  messageInput: {
    minHeight: 120,
    backgroundColor: tokens.color.brand.primary,
    borderRadius: tokens.radii.paper,
  },
  inputOutline: {
    borderWidth: 1,
  },
  errorContainer: {
    alignItems: 'stretch',
    gap: tokens.space.sm,
  },
  error: {
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'stretch',
    paddingVertical: tokens.space.lg,
    gap: tokens.space.lg,
  },
  successMessage: {
    textAlign: 'center',
  },
});

export default SupportContactModal;
