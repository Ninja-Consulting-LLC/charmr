import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';

interface AddMatchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (name: string, platform: string) => void;
}

const PLATFORMS = ['hinge', 'tinder', 'bumble'];

const AddMatchModal: React.FC<AddMatchModalProps> = ({
  visible,
  onDismiss,
  onAdd,
}) => {
  const [name, setName] = React.useState('');
  const [platform, setPlatform] = React.useState('');
  const [platformError, setPlatformError] = React.useState('');

  const handleAdd = () => {
    if (!name) return;

    if (!platform) {
      setPlatformError('Please select a platform');
      return;
    }

    onAdd(name, platform);
    setName('');
    setPlatform('');
    setPlatformError('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Add New Match
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
              testID="close-button"
            />
          </View>

          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <View style={styles.platformContainer}>
            <Text variant="bodyMedium" style={styles.platformLabel}>
              Platform:
            </Text>
            <View style={styles.platformButtons}>
              {PLATFORMS.map(p => (
                <Button
                  key={p}
                  mode={platform === p ? 'contained' : 'outlined'}
                  onPress={() => {
                    setPlatform(p);
                    setPlatformError('');
                  }}
                  style={styles.platformButton}
                  testID={`platform-${p}-button`}>
                  {p}
                </Button>
              ))}
            </View>
            {platformError && (
              <Text style={styles.errorText} testID="platform-error">
                {platformError}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={onDismiss} testID="cancel-button">
              Cancel
            </Button>
            <Button mode="contained" onPress={handleAdd} testID="add-button">
              Add
            </Button>
          </View>
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
  input: {
    marginBottom: 8,
  },
  platformContainer: {
    gap: 8,
  },
  platformLabel: {
    marginBottom: 4,
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  platformButton: {
    flex: 1,
  },
  errorText: {
    color: '#D32F2F',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export default AddMatchModal;
