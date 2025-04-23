import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Button,
  List,
  Modal,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import {useStore} from '../store';

interface MessagePack {
  id: string;
  name: string;
  price: number;
  messages: number;
}

const MESSAGE_PACKS: MessagePack[] = [
  {
    id: 'pack-1',
    name: 'Starter Pack',
    price: 4.99,
    messages: 10,
  },
  {
    id: 'pack-2',
    name: 'Popular Pack',
    price: 9.99,
    messages: 25,
  },
  {
    id: 'pack-3',
    name: 'Mega Pack',
    price: 19.99,
    messages: 60,
  },
];

interface MessagePackModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const MessagePackModal: React.FC<MessagePackModalProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const {user, setUser} = useStore();
  const [selectedPack, setSelectedPack] = useState<MessagePack | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPack || !user) return;

    try {
      setIsPurchasing(true);
      setError(null);

      const response = await fetch('/api/purchase-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId: selectedPack.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to purchase message pack');
      }

      const data = await response.json();

      // Update user in store
      setUser({
        ...user,
        extraMessages: (user.extraMessages || 0) + selectedPack.messages,
      });

      setShowSnackbar(true);
      onDismiss();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to purchase message pack',
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.modal,
            {backgroundColor: theme.colors.surface},
          ]}>
          <Text variant="headlineSmall" style={styles.title}>
            Purchase Additional Messages
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            You've used {user?.dailyMessagesUsed || 0} of{' '}
            {user?.dailyMessageLimit || 5} daily messages.
            {user?.extraMessages
              ? ` You have ${user.extraMessages} extra messages available.`
              : ''}
          </Text>

          <List.Section>
            {MESSAGE_PACKS.map(pack => (
              <List.Item
                key={pack.id}
                title={pack.name}
                description={`${pack.messages} messages for $${pack.price}`}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={
                      selectedPack?.id === pack.id
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                    }
                  />
                )}
                onPress={() => setSelectedPack(pack)}
              />
            ))}
          </List.Section>

          {error && (
            <Text style={[styles.error, {color: theme.colors.error}]}>
              {error}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.button}
              disabled={isPurchasing}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePurchase}
              loading={isPurchasing}
              disabled={!selectedPack || isPurchasing}
              style={styles.button}>
              Purchase
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}>
        Successfully purchased {selectedPack?.messages} messages!
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  error: {
    marginTop: 8,
    textAlign: 'center',
  },
});
