import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Surface, Text} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {getProPaywall, handlePurchase} from '../services/revenueCatService';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[] | null>(null);

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
    setIsLoading(true);
    setError(null);
    try {
      const success = await handlePurchase(productId);
      if (success) {
        onDismiss();
        if (onUpgrade) {
          onUpgrade(productId as SubscriptionTier);
        }
      } else {
        setError('Failed to complete purchase');
      }
    } catch (err) {
      setError('Failed to complete purchase');
    } finally {
      setIsLoading(false);
    }
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
              style={[styles.rateLimitMessage, {color: theme.colors.error}]}>
              {MESSAGES.RATE_LIMIT}
            </Text>
          )}

          {showScreenshotMessage && (
            <Text
              style={[styles.rateLimitMessage, {color: theme.colors.error}]}>
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
                    <Text variant="bodyMedium">{pkg.product.description}</Text>
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            // Fallback UI
            <View style={styles.paywallContainer}>
              <Surface
                style={styles.productCard}
                onTouchEnd={() => handleUpgrade('com.ninjadating.charmr.Pro')}>
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
});

export default UpgradeModal;
