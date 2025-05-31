import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {
  Button,
  Dialog,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
} from 'react-native-paper';
import {theme} from '../theme/theme';
import {Match} from '../utils/matchUtils';

interface HiddenMatchesModalProps {
  visible: boolean;
  onDismiss: () => void;
  hiddenMatches: Match[];
  onRestoreMatch: (match: Match) => void;
  onDeleteMatch: (match: Match) => void;
}

const HiddenMatchesModal: React.FC<HiddenMatchesModalProps> = ({
  visible,
  onDismiss,
  hiddenMatches,
  onRestoreMatch,
  onDeleteMatch,
}) => {
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);

  const handleDeletePress = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = () => {
    if (matchToDelete) {
      onDeleteMatch(matchToDelete);
      setDeleteDialogVisible(false);
      setMatchToDelete(null);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hidden Matches</Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={{color: 'red', textAlign: 'center'}}>
            Hidden matches: {hiddenMatches.length}
          </Text>
          {hiddenMatches.length > 0 ? (
            hiddenMatches.map(match => (
              <List.Item
                key={`${match.id}`}
                title={match.name}
                description={match.platform}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="archive"
                    color={theme.colors.disabled}
                  />
                )}
                right={props => (
                  <View style={styles.itemActions}>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeletePress(match)}
                      style={styles.deleteButton}
                    />
                    <Button
                      mode="text"
                      onPress={() => onRestoreMatch(match)}
                      icon="restore">
                      Restore
                    </Button>
                  </View>
                )}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No hidden matches</Text>
          )}
        </ScrollView>
      </Modal>

      <Dialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}>
        <Dialog.Title>Delete Match</Dialog.Title>
        <Dialog.Content>
          <Text>
            Are you sure you want to delete {matchToDelete?.name}? This action
            cannot be undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleConfirmDelete} textColor={theme.colors.error}>
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 8,
    padding: 16,
    height: '90%',
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
  content: {},
  emptyText: {
    textAlign: 'center',
    color: theme.colors.disabled,
    marginTop: 24,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginRight: 8,
  },
});

export default HiddenMatchesModal;
