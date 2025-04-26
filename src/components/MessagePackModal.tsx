import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Surface, Text} from 'react-native-paper';
import {
  getMessagePackPaywall,
  handlePurchase as purchaseProduct,
} from '../services/revenueCatService';
import {theme} from '../theme/theme';

interface MessagePackModalProps {
  visible: boolean;
  onDismiss: () => void;
  currentBalance: number;
  errorMessage?: string;
}

const MessagePackModal: React.FC<MessagePackModalProps> = ({
  visible,
  onDismiss,
  currentBalance,
  errorMessage,
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
          const messagePackPaywall = await getMessagePackPaywall();
          if (messagePackPaywall) {
            setPackages(messagePackPaywall);
          } else {
            // Fallback to default UI
            setPackages([]);
          }
        } catch (err) {
          setError('Failed to load message pack options');
          // Fallback to default UI
          setPackages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPaywall();
  }, [visible]);

  const handleMessagePackPurchase = async (productId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await purchaseProduct(productId);
      if (success) {
        onDismiss();
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
              Message Pack
            </Text>
            <Button mode="text" onPress={onDismiss} style={styles.closeButton}>
              Close
            </Button>
          </View>

          {errorMessage && (
            <Text style={[styles.errorMessage, {color: theme.colors.error}]}>
              {errorMessage}
            </Text>
          )}

          <Text variant="bodyMedium" style={styles.balanceText}>
            Current balance: {currentBalance} messages
          </Text>

          {isLoading && packages === null ? (
            <Text>Loading message pack options...</Text>
          ) : error ? (
            <Text style={{color: theme.colors.error}}>{error}</Text>
          ) : packages && packages.length > 0 ? (
            <View style={styles.paywallContainer}>
              {packages.map((pkg: any) => (
                <Surface
                  key={pkg.identifier}
                  style={styles.productCard}
                  onTouchEnd={() =>
                    handleMessagePackPurchase(pkg.product.identifier)
                  }>
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
                onTouchEnd={() =>
                  handleMessagePackPurchase(
                    'com.ninjadating.charmr.MessagePack',
                  )
                }>
                <View style={styles.productContent}>
                  <Text variant="titleMedium">Message Pack</Text>
                  <Text
                    variant="headlineMedium"
                    style={{color: theme.colors.primary}}>
                    $4.99
                  </Text>
                  <Text variant="bodyMedium">50 additional messages</Text>
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
  balanceText: {
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
  errorMessage: {
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default MessagePackModal;
