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
import {MESSAGES} from '../constants/messages';
import {getProPaywall, handlePurchase} from '../services/revenueCatService';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';

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
  onUpgrade: _onUpgrade,
  showRateLimitMessage,
  showScreenshotMessage,
  showPresetPaywall: _showPresetPaywall,
  onPurchaseSuccess,
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
          const proPaywall = await getProPaywall();
          setPackages(proPaywall || []);
        } catch (_err) {
          setError('We could not load plans. Check your connection and try again.');
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
        onPurchaseSuccess?.();
        onDismiss();
      }
    } catch (err) {
      console.error('[UpgradeModal] handleUpgrade error', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={[styles.card, {maxHeight: sheetMaxHeight}]}>
            <View testID="upgrade-modal" style={styles.content}>
              <View style={styles.header}>
                <AppText variant="titleSm" color="hero" style={styles.title}>
                  Upgrade to Pro
                </AppText>
                <CharmrButton
                  label="Close"
                  variant="ghost"
                  onPress={onDismiss}
                  testID="upgrade-modal-close"
                  style={styles.closeBtn}
                />
              </View>

              {showRateLimitMessage && (
                <AppText variant="bodyMedium" color="danger" style={styles.rateLimitMessage}>
                  {MESSAGES.RATE_LIMIT}
                </AppText>
              )}

              {showScreenshotMessage && (
                <AppText variant="bodyMedium" color="danger" style={styles.rateLimitMessage}>
                  {MESSAGES.SCREENSHOT_LIMIT}
                </AppText>
              )}

              {isLoading ? (
                <AppText variant="body" color="heroMuted">
                  Loading plans…
                </AppText>
              ) : error ? (
                <AppText variant="bodyMedium" color="danger">
                  {error}
                </AppText>
              ) : packages && packages.length > 0 ? (
                <View style={styles.paywallContainer}>
                  {packages.map((pkg: any) => (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => handleUpgrade(pkg.product.identifier)}
                      style={({pressed}) => [
                        styles.productCard,
                        pressed && styles.productCardPressed,
                      ]}>
                      <View style={styles.productContent}>
                        <AppText variant="titleSm" color="hero">
                          {pkg.product.title}
                        </AppText>
                        {pkg.product.subscriptionPeriod === 'P1Y' ? (
                          <>
                            <AppText variant="title" color="hero" style={styles.price}>
                              ${(pkg.product.price / 12).toFixed(2)}/mo
                            </AppText>
                            <AppText variant="caption" color="heroMuted">
                              Billed annually at {pkg.product.priceString}
                            </AppText>
                          </>
                        ) : (
                          <AppText variant="title" color="hero" style={styles.price}>
                            {pkg.product.priceString}
                          </AppText>
                        )}
                        <AppText variant="body" color="heroMuted" style={styles.desc}>
                          {pkg.product.description}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <AppText variant="body" color="heroMuted">
                  No plans are available right now. Try again later.
                </AppText>
              )}
            </View>
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {},
  content: {
    width: '100%',
    gap: tokens.space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  title: {
    flex: 1,
  },
  closeBtn: {
    minHeight: 40,
    paddingHorizontal: tokens.space.sm,
  },
  rateLimitMessage: {
    textAlign: 'center',
  },
  paywallContainer: {
    gap: tokens.space.md,
    marginTop: tokens.space.sm,
  },
  productCard: {
    padding: tokens.space.lg,
    borderRadius: tokens.radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...tokens.elevation.sm,
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

export default UpgradeModal;
