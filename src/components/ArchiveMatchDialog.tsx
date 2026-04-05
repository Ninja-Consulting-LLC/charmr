import React from 'react';
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
          <Button testID="archive-match-cancel-button" onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            testID="archive-match-confirm-button"
            onPress={onArchive}
            mode="contained">
            Archive
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default ArchiveMatchDialog;
