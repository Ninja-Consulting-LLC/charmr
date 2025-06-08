import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Surface, Text} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {getProPaywall, handlePurchase} from '../services/revenueCatService';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import LoginModal from './LoginModal';

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade?: (tier: SubscriptionTier) => void;
  showRateLimitMessage?: boolean;
  showScreenshotMessage?: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  showRateLimitMessage,
  showScreenshotMessage,
}) => {
  const {user, setUser, handleGoogleLogin} = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);

  const isAnonymous = user?.email === user?.installationId;

  // Reset states when modal visibility changes
  useEffect(() => {
    if (!visible) {
      setShowSuccess(false);
      setShowRegistrationPrompt(false);
      setShowLoginModal(false);
    }
  }, [visible]);

  useEffect(() => {
    const fetchPaywall = async () => {
      if (visible) {
        setIsLoading(true);
        setError(null);
        try {
          const proPaywall = await getProPaywall();
          if (proPaywall) {
            setPackages(proPaywall);
          } else {
            // Fallback to default UI
            setPackages([]);
          }
        } catch (err) {
          setError('Failed to load subscription options');
          // Fallback to default UI
          setPackages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPaywall();
  }, [visible]);

  const handleUpgrade = async (productId: string) => {
    console.log('[UpgradeModal] handleUpgrade called with', productId);
    setIsLoading(true);
    setError(null);
    try {
      const success = await handlePurchase(productId, user, setUser);
      console.log('[UpgradeModal] handlePurchase returned', success);
      if (success) {
        setShowSuccess(true);
        console.log('[UpgradeModal] setShowSuccess(true)');
        if (isAnonymous) {
          setShowRegistrationPrompt(true);
        }
      }
    } catch (err) {
      console.log('[UpgradeModal] handleUpgrade error', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowRegistrationPrompt(false);
  };

  useEffect(() => {
    console.log('[UpgradeModal] showSuccess changed:', showSuccess);
  }, [showSuccess]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {showSuccess ? '' : 'Upgrade Your Plan'}
            </Text>
            <Button mode="text" onPress={onDismiss} style={styles.closeButton}>
              Close
            </Button>
          </View>

          {showSuccess ? (
            <View style={styles.successContainer}>
              <Text
                variant="headlineMedium"
                style={[styles.successMessage, {color: theme.colors.primary}]}>
                🎉 Welcome to Pro!
              </Text>
              <Text variant="bodyLarge" style={styles.successSubMessage}>
                Your subscription is now active. Enjoy unlimited messages and
                all premium features.
              </Text>
              {showRegistrationPrompt && (
                <View style={styles.registrationPrompt}>
                  <Text
                    variant="bodyMedium"
                    style={[styles.warningText, {color: theme.colors.error}]}>
                    ⚠️ You are currently using the app anonymously. To ensure
                    you don't lose your purchase, please register an account.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => setShowLoginModal(true)}
                    style={styles.registerButton}>
                    Register Now
                  </Button>
                  <Button
                    mode="text"
                    onPress={onDismiss}
                    style={styles.skipButton}>
                    Skip for now
                  </Button>
                </View>
              )}
              {!showRegistrationPrompt && (
                <Button
                  mode="contained"
                  onPress={onDismiss}
                  style={styles.dismissButton}>
                  Got it!
                </Button>
              )}
            </View>
          ) : (
            <>
              {showRateLimitMessage && (
                <Text
                  style={[
                    styles.rateLimitMessage,
                    {color: theme.colors.error},
                  ]}>
                  {MESSAGES.RATE_LIMIT}
                </Text>
              )}

              {showScreenshotMessage && (
                <Text
                  style={[
                    styles.rateLimitMessage,
                    {color: theme.colors.error},
                  ]}>
                  {MESSAGES.SCREENSHOT_LIMIT}
                </Text>
              )}

              {isLoading && packages === null ? (
                <Text>Loading subscription options...</Text>
              ) : error ? (
                <Text style={{color: theme.colors.error}}>{error}</Text>
              ) : packages && packages.length > 0 ? (
                <View style={styles.paywallContainer}>
                  {packages.map((pkg: any) => (
                    <Surface
                      key={pkg.identifier}
                      style={styles.productCard}
                      onTouchEnd={() => handleUpgrade(pkg.product.identifier)}>
                      <View style={styles.productContent}>
                        <Text variant="titleMedium">{pkg.product.title}</Text>
                        <Text
                          variant="headlineMedium"
                          style={{color: theme.colors.primary}}>
                          {pkg.product.priceString}
                        </Text>
                        <Text variant="bodyMedium">
                          {pkg.product.description}
                        </Text>
                      </View>
                    </Surface>
                  ))}
                </View>
              ) : (
                // Fallback UI
                <View style={styles.paywallContainer}>
                  <Surface
                    style={styles.productCard}
                    onTouchEnd={() =>
                      handleUpgrade('com.ninjadating.charmr.Pro')
                    }>
                    <View style={styles.productContent}>
                      <Text variant="titleMedium">Pro Plan</Text>
                      <Text
                        variant="headlineMedium"
                        style={{color: theme.colors.primary}}>
                        $9.99/month
                      </Text>
                      <Text variant="bodyMedium">
                        Unlimited messages and advanced features
                      </Text>
                    </View>
                  </Surface>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        handleGoogleLogin={handleGoogleLogin}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: theme.roundness,
  },
  content: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  rateLimitMessage: {
    textAlign: 'center',
    marginBottom: 8,
  },
  paywallContainer: {
    gap: 8,
  },
  productCard: {
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 12,
  },
  productContent: {
    alignItems: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubMessage: {
    textAlign: 'center',
    opacity: 0.8,
  },
  dismissButton: {
    marginTop: 16,
  },
  registrationPrompt: {
    backgroundColor: theme.colors.errorContainer,
    padding: 16,
    borderRadius: theme.roundness,
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  warningText: {
    textAlign: 'center',
  },
  registerButton: {
    marginTop: 8,
  },
  skipButton: {
    marginTop: 4,
  },
});

export default UpgradeModal;
