import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Surface, Text } from 'react-native-paper';
import { MESSAGES } from '../constants/messages';
import { getProPaywall, handlePurchase } from '../services/revenueCatService';
import { useStore } from '../store';
import { theme } from '../theme/theme';
import { SubscriptionTier } from '../types/enums';
import LoginModal from './LoginModal';

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade?: (tier: SubscriptionTier) => void;
  showRateLimitMessage?: boolean;
  showScreenshotMessage?: boolean;
  showPresetPaywall?: boolean;
  onPurchaseSuccess?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  showRateLimitMessage,
  showScreenshotMessage,
  showPresetPaywall,
  onPurchaseSuccess,
}) => {
  const {user, setUser, handleProviderLogin} = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [packages, setPackages] = useState<any[] | null>(null);

  const isAnonymous = user?.email === user?.installationId;

  // Reset states when modal visibility changes
  useEffect(() => {
    if (!visible) {
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
          setPackages(proPaywall || []);
        } catch (err) {
          setError('Failed to load subscription options. Please try again later.');
          setPackages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchPaywall();
  }, [visible]);

  const handleUpgrade = async (productId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await handlePurchase(productId, user, setUser);
      if (success) {
        if (isAnonymous) {
          setShowRegistrationPrompt(true);
        }
        onPurchaseSuccess?.();
        onDismiss();
      }
    } catch (err) {
      console.error('[UpgradeModal] handleUpgrade error', err);
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

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View testID="upgrade-modal" style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Upgrade Your Plan
            </Text>
            <Button
              mode="text"
              onPress={onDismiss}
              style={styles.closeButton}
              testID="upgrade-modal-close">
              Close
            </Button>
          </View>

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

          {isLoading ? (
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
                    {pkg.product.subscriptionPeriod === 'P1Y' ? (
                      <>
                        <Text variant="headlineMedium" style={{color: theme.colors.primary}}>
                          ${ (pkg.product.price / 12).toFixed(2) }/mo
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Billed annually at {pkg.product.priceString}
                        </Text>
                      </>
                    ) : (
                      <Text variant="headlineMedium" style={{color: theme.colors.primary}}>
                        {pkg.product.priceString}
                      </Text>
                    )}
                    <Text variant="bodyMedium">
                      {pkg.product.description}
                    </Text>
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <Text>No subscription options available.</Text>
          )}
        </View>
      </Modal>

      <LoginModal
        visible={showLoginModal}
        onDismiss={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        handleProviderLogin={handleProviderLogin}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    marginLeft: 10,
  },
  rateLimitMessage: {
    marginBottom: 20,
    textAlign: 'center',
  },
  paywallContainer: {
    marginTop: 20,
  },
  productCard: {
    padding: 20,
    borderRadius: 8,
    elevation: 2,
  },
  productContent: {
    alignItems: 'center',
  },
});

export default UpgradeModal;
