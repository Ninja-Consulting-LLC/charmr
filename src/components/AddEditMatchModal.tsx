import React, {useState} from 'react';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {theme} from '../theme/theme';

interface AddEditMatchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddMatch: (name: string, platform: string) => Promise<void>;
  isEditing?: boolean;
  initialName?: string;
  initialPlatform?: string;
  onUpdateMatch?: (name: string, platform: string) => Promise<void>;
}

const PLATFORMS = ['hinge', 'tinder', 'bumble', 'other'];

const AddEditMatchModal: React.FC<AddEditMatchModalProps> = ({
  visible,
  onDismiss,
  onAddMatch,
  isEditing = false,
  initialName = '',
  initialPlatform = '',
  onUpdateMatch,
}) => {
  const [name, setName] = useState(initialName);
  const [platform, setPlatform] = useState(initialPlatform);
  const [otherPlatform, setOtherPlatform] = useState(
    initialPlatform === 'other' ? initialPlatform : '',
  );
  const [platformError, setPlatformError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPlatform(initialPlatform);
      setOtherPlatform(initialPlatform === 'other' ? initialPlatform : '');
    }
  }, [visible, initialName, initialPlatform]);

  const handleAdd = async () => {
    if (!name.trim()) {
      return;
    }
    if (!platform) {
      setPlatformError('Please select a platform');
      return;
    }
    if (platform === 'other' && !otherPlatform.trim()) {
      setPlatformError('Please enter platform name');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && onUpdateMatch) {
        await onUpdateMatch(
          name.trim(),
          platform === 'other' ? otherPlatform.trim() : platform,
        );
        setShowSnackbar(true);
        onDismiss();
      } else {
        await onAddMatch(
          name.trim(),
          platform === 'other' ? otherPlatform.trim() : platform,
        );
      }
      setName('');
      setPlatform('');
      setOtherPlatform('');
      setPlatformError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformSelect = (selectedPlatform: string) => {
    setPlatform(selectedPlatform);
    setPlatformError('');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isEditing ? 'Edit Match' : 'Add New Match'}
              </Text>
              <IconButton icon="close" size={20} onPress={onDismiss} />
            </View>

            <View style={styles.content}>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
                disabled={isLoading}
              />

              <Text style={styles.platformLabel}>Platform</Text>
              <View style={styles.platformButtons}>
                {PLATFORMS.map(p => (
                  <Button
                    key={p}
                    mode={platform === p ? 'contained' : 'outlined'}
                    onPress={() => handlePlatformSelect(p)}
                    style={styles.platformButton}
                    testID={`platform-${p}-button`}
                    disabled={isLoading}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </View>

              {platform === 'other' && (
                <TextInput
                  label="Enter Platform Name"
                  value={otherPlatform}
                  onChangeText={setOtherPlatform}
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
              )}

              {platformError ? (
                <Text style={styles.errorText} testID="platform-error">
                  {platformError}
                </Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleAdd}
                disabled={!name.trim() || isLoading}
                style={styles.button}
                testID="add-button">
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : isEditing ? (
                  'Update Match'
                ) : (
                  'Add Match'
                )}
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
        style={[styles.snackbar, {backgroundColor: 'rgba(0, 0, 0, 0.6)'}]}
        action={{
          label: 'OK',
          onPress: () => setShowSnackbar(false),
        }}>
        Match updated successfully!
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  platformLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  platformButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformButton: {
    width: '48%',
    paddingHorizontal: 0,
    marginVertical: 4,
    marginBottom: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
  },
  button: {
    marginTop: 8,
  },
  snackbar: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 8,
  },
});

export default AddEditMatchModal;
