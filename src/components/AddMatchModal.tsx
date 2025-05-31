import React, {useState} from 'react';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import {theme} from '../theme/theme';

interface AddMatchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddMatch: (name: string, platform: string) => void;
}

const AddMatchModal: React.FC<AddMatchModalProps> = ({
  visible,
  onDismiss,
  onAddMatch,
}) => {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');

  const handleAdd = () => {
    if (name.trim() && platform.trim()) {
      onAddMatch(name.trim(), platform.trim());
      setName('');
      setPlatform('');
    }
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
              <Text style={styles.title}>Add New Match</Text>
              <IconButton icon="close" size={20} onPress={onDismiss} />
            </View>

            <View style={styles.content}>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Platform"
                value={platform}
                onChangeText={setPlatform}
                style={styles.input}
                mode="outlined"
              />

              <Button
                mode="contained"
                onPress={handleAdd}
                disabled={!name.trim() || !platform.trim()}
                style={styles.button}>
                Add Match
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  button: {
    marginTop: 8,
  },
});

export default AddMatchModal;
