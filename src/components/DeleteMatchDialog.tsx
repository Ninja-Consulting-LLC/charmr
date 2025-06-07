import React from 'react';
import {StyleSheet} from 'react-native';
import {Button, Dialog, Portal, Text} from 'react-native-paper';
import {theme} from '../theme/theme';

interface DeleteMatchDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  onArchive: () => void;
  matchName: string;
}

const DeleteMatchDialog: React.FC<DeleteMatchDialogProps> = ({
  visible,
  onDismiss,
  onConfirm,
  onArchive,
  matchName,
}) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Delete Match</Dialog.Title>
        <Dialog.Content>
          <Text>
            Are you sure you want to delete {matchName}? This action cannot be
            undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onArchive}>Archive</Button>
          <Button onPress={onConfirm} textColor={theme.colors.error}>
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({});

export default DeleteMatchDialog;
