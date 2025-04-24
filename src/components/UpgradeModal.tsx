import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Surface, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
  showRateLimitMessage?: boolean;
}

const TIERS = [
  {
    id: SubscriptionTier.BASIC,
    name: 'Basic',
    price: '$4.99/month',
    messages: '100 messages/month',
    features: ['Basic response generation', 'Standard support'],
  },
  {
    id: SubscriptionTier.PREMIUM,
    name: 'Premium',
    price: '$9.99/month',
    messages: '300 messages/month',
    features: [
      'Advanced response generation',
      'Priority support',
      'Custom response styles',
    ],
  },
  {
    id: SubscriptionTier.PRO,
    name: 'Pro',
    price: '$19.99/month',
    messages: 'Unlimited messages',
    features: [
      'Premium response generation',
      '24/7 priority support',
      'Custom response styles',
      'Advanced analytics',
    ],
  },
];

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  showRateLimitMessage,
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    SubscriptionTier.PREMIUM,
  );

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
              You've reached your daily message limit. Upgrade to continue using
              Flirtonic.
            </Text>
          )}

          <View style={styles.tiersContainer}>
            {TIERS.map(tier => (
              <Surface
                key={tier.id}
                style={[
                  styles.tierCard,
                  selectedTier === tier.id && styles.selectedTier,
                ]}>
                <View style={styles.tierCardPressable}>
                  <Text variant="titleMedium" style={styles.tierName}>
                    {tier.name}
                  </Text>
                  <Text
                    variant="headlineMedium"
                    style={[styles.tierPrice, {color: theme.colors.primary}]}>
                    {tier.price}
                  </Text>
                  <Text variant="bodyMedium" style={styles.tierMessages}>
                    {tier.messages}
                  </Text>
                  <View style={styles.featuresContainer}>
                    {tier.features.map((feature, index) => (
                      <Text
                        key={index}
                        variant="bodySmall"
                        style={styles.feature}>
                        • {feature}
                      </Text>
                    ))}
                  </View>
                </View>
              </Surface>
            ))}
          </View>

          <Button
            mode="contained"
            onPress={() => onUpgrade(selectedTier)}
            style={styles.upgradeButton}>
            Upgrade Now
          </Button>
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
  tiersContainer: {
    gap: 8,
  },
  tierCard: {
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  selectedTier: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  tierCardPressable: {
    padding: 12,
    alignItems: 'center',
  },
  tierName: {
    marginBottom: 4,
  },
  tierPrice: {
    marginBottom: 2,
  },
  tierMessages: {
    marginBottom: 8,
  },
  featuresContainer: {
    width: '100%',
  },
  feature: {
    marginBottom: 2,
    fontSize: 12,
  },
  upgradeButton: {
    marginTop: 16,
  },
});

export default UpgradeModal;
