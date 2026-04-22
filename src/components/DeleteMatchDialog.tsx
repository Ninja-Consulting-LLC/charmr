import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Dialog, Portal} from 'react-native-paper';
import {AppText, CharmrButton, tokens} from '../design-system';

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
          <AppText
            variant="body"
            style={{color: tokens.color.text.onInverse}}>
            Are you sure you want to delete {matchName}? This action cannot be
            undone.
          </AppText>
        </Dialog.Content>
        <View style={styles.actions}>
          <CharmrButton label="Cancel" variant="outline" compact onPress={onDismiss} />
          <CharmrButton label="Archive" variant="outline" compact onPress={onArchive} />
          <CharmrButton label="Delete" variant="danger" compact onPress={onConfirm} />
        </View>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.md,
  },
});

export default DeleteMatchDialog;
