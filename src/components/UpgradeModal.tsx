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
  const {user, setUser, handleGoogleLogin} = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[] | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);

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
      if (visible && !showPresetPaywall) {
        console.log('[UpgradeModal] Starting to fetch paywall...');
        setIsLoading(true);
        setError(null);
        try {
          const proPaywall = await getProPaywall();
          console.log('[UpgradeModal] Paywall fetch result:', {
            hasPaywall: !!proPaywall,
            packageCount: proPaywall?.length || 0,
          });

          if (proPaywall) {
            setPackages(proPaywall);
          } else {
            console.log('[UpgradeModal] No paywall data, using fallback UI');
            setPackages([]);
          }
        } catch (err) {
          console.error('[UpgradeModal] Error fetching paywall:', err);
          setError('Failed to load subscription options');
          setPackages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPaywall();
  }, [visible, showPresetPaywall]);

  const handleUpgrade = async (productId: string) => {
    console.log('[UpgradeModal] handleUpgrade called with', productId);
    setIsLoading(true);
    setError(null);
    try {
      const success = await handlePurchase(productId, user, setUser);
      console.log('[UpgradeModal] handlePurchase returned', success);
      if (success) {
        if (isAnonymous) {
          setShowRegistrationPrompt(true);
        }
        onPurchaseSuccess?.();
        onDismiss();
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
              Upgrade Your Plan
            </Text>
            <Button mode="text" onPress={onDismiss} style={styles.closeButton}>
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
    marginBottom: 16,
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
});

export default UpgradeModal;
