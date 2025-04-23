import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Surface,
  Text,
} from 'react-native-paper';

interface MessagePack {
  id: string;
  name: string;
  price: string;
  messages: number;
}

const MESSAGE_PACKS: MessagePack[] = [
  {
    id: 'pack-10',
    name: '10 Messages',
    price: '$1.99',
    messages: 10,
  },
  {
    id: 'pack-25',
    name: '25 Messages',
    price: '$3.99',
    messages: 25,
  },
  {
    id: 'pack-50',
    name: '50 Messages',
    price: '$6.99',
    messages: 50,
  },
];

interface MessagePackModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPurchase: (packId: string) => void;
}

const MessagePackModal: React.FC<MessagePackModalProps> = ({
  visible,
  onDismiss,
  onPurchase,
}) => {
  const [selectedPack, setSelectedPack] = React.useState<string>('pack-25');

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Buy More Messages
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
              testID="close-button"
              accessibilityLabel="Close modal"
            />
          </View>

          <Text variant="bodyMedium" style={styles.description}>
            Purchase additional messages to continue generating responses. These
            messages will be added to your daily limit.
          </Text>

          <View style={styles.packsContainer}>
            {MESSAGE_PACKS.map(pack => (
              <Surface
                key={pack.id}
                style={[
                  styles.packCard,
                  selectedPack === pack.id && styles.selectedPack,
                ]}
                testID={`${pack.id}-pack-card`}>
                <Button
                  mode={selectedPack === pack.id ? 'contained' : 'outlined'}
                  onPress={() => setSelectedPack(pack.id)}
                  style={styles.packButton}
                  testID={`${pack.id}-pack`}
                  accessibilityLabel={`Select ${pack.name} pack`}>
                  <Text variant="titleMedium" style={styles.packName}>
                    {pack.name}
                  </Text>
                  <Text variant="headlineMedium" style={styles.packPrice}>
                    {pack.price}
                  </Text>
                </Button>
              </Surface>
            ))}
          </View>

          <Button
            mode="contained"
            onPress={() => onPurchase(selectedPack)}
            style={styles.purchaseButton}
            testID="purchase-button"
            accessibilityLabel="Purchase selected message pack">
            Purchase Now
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
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  packsContainer: {
    gap: 8,
  },
  packCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPack: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  packButton: {
    padding: 12,
    alignItems: 'center',
  },
  packName: {
    marginBottom: 4,
  },
  packPrice: {
    color: '#1976D2',
  },
  purchaseButton: {
    marginTop: 16,
  },
});

export default MessagePackModal;
