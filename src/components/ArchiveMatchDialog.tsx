import React from 'react';
import {StyleSheet} from 'react-native';
import {Button, Dialog, Portal, Text} from 'react-native-paper';

interface ArchiveMatchDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onArchive: () => void;
  matchName: string;
}

const ArchiveMatchDialog: React.FC<ArchiveMatchDialogProps> = ({
  visible,
  onDismiss,
  onArchive,
  matchName,
}) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Archive Match</Dialog.Title>
        <Dialog.Content>
          <Text>
            Are you sure you want to archive {matchName}? You can restore it
            later from the archived matches.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onArchive} mode="contained">
            Archive
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({});

export default ArchiveMatchDialog;
