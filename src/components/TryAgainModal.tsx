import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { theme } from '../theme/theme';

interface TryAgainModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const TryAgainModal: React.FC<TryAgainModalProps> = ({
  visible,
  onDismiss,
}) => {
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
          <Text variant="headlineSmall" style={styles.title}>
            Request Timed Out
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            The request took too long to complete. To try again, click the Generate Response button.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.button}
              testID="try-again-close-button">
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 16,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});

export default TryAgainModal;