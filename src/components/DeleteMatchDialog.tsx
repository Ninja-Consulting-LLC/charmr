import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, IconButton, Modal, Portal, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
import {Match} from '../utils/matchUtils';

interface DeleteMatchDialogProps {
  visible: boolean;
  onDismiss: () => void;
  match: Match | null;
  onDelete: () => void;
  onArchive: () => void;
}

const DeleteMatchDialog: React.FC<DeleteMatchDialogProps> = ({
  visible,
  onDismiss,
  match,
  onDelete,
  onArchive,
}) => {
  if (!match) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Match Options</Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>

        <View style={styles.content}>
          <Text style={styles.message}>
            What would you like to do with {match.name}?
          </Text>

          <View style={styles.buttons}>
            <Button
              mode="outlined"
              onPress={onArchive}
              style={styles.button}
              icon="archive">
              Archive
            </Button>
            <Button
              mode="contained-tonal"
              onPress={onDelete}
              style={styles.button}
              icon="delete"
              textColor={theme.colors.error}>
              Delete
            </Button>
          </View>
        </View>
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
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    minWidth: 120,
  },
});

export default DeleteMatchDialog;
