import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Surface,
  Text,
} from 'react-native-paper';

interface Tier {
  id: string;
  name: string;
  price: string;
  messages: string;
  features: string[];
}

const TIERS: Tier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$4.99',
    messages: '50 messages',
    features: ['50 messages per day', 'Basic support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    messages: '200 messages',
    features: ['200 messages per day', 'Priority support', 'Advanced features'],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$19.99',
    messages: 'Unlimited',
    features: [
      'Unlimited messages',
      'Priority support',
      'All features',
      'Early access to new features',
    ],
  },
];

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: (tierId: string) => void;
  showRateLimitMessage?: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  showRateLimitMessage = false,
}) => {
  const [selectedTier, setSelectedTier] = React.useState<string>('pro');

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Choose Your Plan
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          {showRateLimitMessage && (
            <Text variant="titleMedium" style={styles.rateLimitMessage}>
              Upgrade to receive more messages - you're out of messages for
              today!
            </Text>
          )}

          <View style={styles.tiersContainer}>
            {TIERS.map(tier => (
              <Surface
                key={tier.id}
                style={[
                  styles.tierCard,
                  selectedTier === tier.id && styles.selectedTier,
                ]}
                elevation={selectedTier === tier.id ? 4 : 1}>
                <Pressable
                  style={styles.tierCardPressable}
                  onPress={() => setSelectedTier(tier.id)}>
                  <Text variant="titleMedium" style={styles.tierName}>
                    {tier.name}
                  </Text>
                  <Text variant="headlineMedium" style={styles.tierPrice}>
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
                </Pressable>
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
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
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
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  tiersContainer: {
    gap: 8,
  },
  tierCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTier: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  tierCardPressable: {
    alignItems: 'center',
  },
  tierName: {
    marginBottom: 4,
  },
  tierPrice: {
    color: '#1976D2',
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
