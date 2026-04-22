import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
import {
  getMessagePackPaywall,
  handlePurchase as purchaseProduct,
} from '../services/revenueCatService';
import {useStore} from '../store';

interface MessagePackModalProps {
  visible: boolean;
  onDismiss: () => void;
  currentBalance: number;
  errorMessage?: string;
  onUpgrade?: () => void;
}

const MessagePackModal: React.FC<MessagePackModalProps> = ({
  visible,
  onDismiss,
  currentBalance,
  errorMessage,
  onUpgrade,
}) => {
  const {user, setUser} = useStore();
  const {height: windowHeight} = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.88);
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
            setPackages([]);
          }
        } catch (_err) {
          setError('Failed to load message pack options');
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
      const success = await purchaseProduct(productId, user, setUser);
      if (success) {
        onDismiss();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    onDismiss();
    onUpgrade?.();
  };

  const renderPack = (pkg: any) => (
    <Pressable
      key={pkg.identifier ?? pkg.product?.identifier}
      onPress={() => handleMessagePackPurchase(pkg.product.identifier)}
      style={({pressed}) => [
        styles.productCard,
        pressed && styles.productCardPressed,
      ]}>
      <View style={styles.productContent}>
        <AppText variant="titleSm" color="hero">
          {pkg.product.title}
        </AppText>
        <AppText variant="title" color="hero" style={styles.price}>
          {pkg.product.priceString}
        </AppText>
        <AppText variant="body" color="heroMuted" style={styles.desc}>
          {pkg.product.description}
        </AppText>
      </View>
    </Pressable>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={[styles.card, {maxHeight: sheetMaxHeight}]}>
            <View style={styles.header}>
              <AppText variant="titleSm" color="hero" style={styles.headerTitle}>
                Message Pack
              </AppText>
              <CharmrButton
                label="Close"
                variant="ghost"
                onPress={onDismiss}
                style={styles.closeBtn}
              />
            </View>

            {errorMessage && (
              <AppText variant="bodyMedium" color="danger" style={styles.centered}>
                {errorMessage}
              </AppText>
            )}

            <AppText variant="body" color="heroMuted" style={styles.centered}>
              Current balance: {currentBalance} messages
            </AppText>

            {isLoading && packages === null ? (
              <AppText variant="body" color="heroMuted">
                Loading message pack options...
              </AppText>
            ) : error ? (
              <AppText variant="bodyMedium" color="danger">
                {error}
              </AppText>
            ) : packages && packages.length > 0 ? (
              <View style={styles.paywallContainer}>
                {packages.map((pkg: any) => renderPack(pkg))}
              </View>
            ) : (
              <View style={styles.paywallContainer}>
                <Pressable
                  onPress={() =>
                    handleMessagePackPurchase('com.ninjadating.charmr.MessagePack')
                  }
                  style={({pressed}) => [
                    styles.productCard,
                    pressed && styles.productCardPressed,
                  ]}>
                  <View style={styles.productContent}>
                    <AppText variant="titleSm" color="hero">
                      Message Pack
                    </AppText>
                    <AppText variant="title" color="hero" style={styles.price}>
                      $4.99
                    </AppText>
                    <AppText variant="body" color="heroMuted">
                      50 additional messages
                    </AppText>
                  </View>
                </Pressable>
              </View>
            )}

            <CharmrButton
              label="Upgrade to Pro"
              variant="outline"
              onPress={handleUpgrade}
              fullWidth
            />
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: tokens.space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  headerTitle: {
    flex: 1,
  },
  closeBtn: {
    minHeight: 40,
    paddingHorizontal: tokens.space.sm,
  },
  centered: {
    textAlign: 'center',
  },
  paywallContainer: {
    gap: tokens.space.sm,
  },
  productCard: {
    borderRadius: tokens.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: tokens.space.md,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  productCardPressed: {
    opacity: 0.92,
  },
  productContent: {
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  price: {
    color: tokens.color.accent.mint,
  },
  desc: {
    textAlign: 'center',
  },
});

export default MessagePackModal;
