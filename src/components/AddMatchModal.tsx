import React, {useRef, useState} from 'react';
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
  const [localName, setLocalName] = useState('');
  const [platform, setPlatform] = useState('');
  const [platformError, setPlatformError] = useState('');
  const nameRef = useRef(localName);

  // Update the ref whenever localName changes
  React.useEffect(() => {
    nameRef.current = localName;
  }, [localName]);

  const handleAdd = () => {
    if (!nameRef.current) return;

    if (!platform) {
      setPlatformError('Please select a platform');
      return;
    }

    onAdd(nameRef.current, platform);
    setLocalName('');
    setPlatform('');
    setPlatformError('');
    onDismiss();
  };

  // Reset local state when modal is closed
  React.useEffect(() => {
    if (!visible) {
      setLocalName('');
      setPlatform('');
      setPlatformError('');
    }
  }, [visible]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.overflowContainer}>
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
              value={localName}
              onChangeText={setLocalName}
              style={styles.input}
            />

            <View style={styles.platformContainer}>
              <Text variant="bodyMedium" style={styles.platformLabel}>
                Platform:
              </Text>
              <View style={styles.platformButtons}>
                {PLATFORMS.map((p, idx) => (
                  <Button
                    key={p}
                    mode={platform === p ? 'contained' : 'outlined'}
                    onPress={() => {
                      setPlatform(p);
                      setPlatformError('');
                    }}
                    style={[
                      styles.platformButton,
                      idx === PLATFORMS.length - 1 && {marginRight: 0},
                    ]}
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
              <Button
                mode="outlined"
                onPress={onDismiss}
                testID="cancel-button">
                Cancel
              </Button>
              <Button mode="contained" onPress={handleAdd} testID="add-button">
                Add
              </Button>
            </View>
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
    zIndex: 2000,
  },
  overflowContainer: {},
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
  },
  platformButton: {
    marginRight: 8,
    height: 40,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
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
