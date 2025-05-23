import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
} from 'react-native-paper';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {Match} from '../utils/matchUtils';
import DeleteMatchDialog from './DeleteMatchDialog';

interface MatchSelectorModalProps {
  visible: boolean;
  onDismiss: () => void;
  matches: Match[];
  selectedMatch: Match | null;
  onSelectMatch: (match: Match) => void;
  onAddMatch: () => void;
  onDeleteMatch: (matchId: string) => void;
  onHideMatch: (match: Match) => void;
  onRestoreMatch: (match: Match) => void;
  userPlan: SubscriptionTier;
}

const MatchSelectorModal: React.FC<MatchSelectorModalProps> = ({
  visible,
  onDismiss,
  matches,
  selectedMatch,
  onSelectMatch,
  onAddMatch,
  onDeleteMatch,
  onHideMatch,
  onRestoreMatch,
  userPlan,
}) => {
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [matchToDelete, setMatchToDelete] = React.useState<Match | null>(null);

  const handleDeletePress = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = () => {
    if (matchToDelete) {
      onDeleteMatch(matchToDelete.id);
      setDeleteDialogVisible(false);
      setMatchToDelete(null);
    }
  };

  const handleArchive = () => {
    if (matchToDelete) {
      onHideMatch(matchToDelete);
      setDeleteDialogVisible(false);
      setMatchToDelete(null);
    }
  };

  // Sort matches by lastUsed date, most recent first
  const sortedMatches = React.useMemo(() => {
    return [...matches]
      .filter(match => !match.hidden) // Filter out hidden matches
      .sort((a, b) => {
        // If one of them is the selected match, put it first
        if (selectedMatch) {
          if (a.id === selectedMatch.id) return -1;
          if (b.id === selectedMatch.id) return 1;
        }
        // Then sort by lastUsed date
        if (!a.lastUsed && !b.lastUsed) return 0;
        if (!a.lastUsed) return 1;
        if (!b.lastUsed) return -1;
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });
  }, [matches, selectedMatch]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Match</Text>
            <IconButton
              icon="close"
              size={20}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          <ScrollView style={styles.scrollView}>
            {sortedMatches.map(match => (
              <List.Item
                key={`${match.platform}::${match.name}`}
                title={match.name}
                description={match.platform}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={match.hidden ? 'archive' : 'account'}
                    color={
                      match.hidden
                        ? theme.colors.disabled
                        : theme.colors.primary
                    }
                  />
                )}
                right={props => (
                  <View style={styles.itemActions}>
                    <IconButton
                      {...props}
                      icon={match.hidden ? 'restore' : 'dots-vertical'}
                      onPress={() =>
                        match.hidden
                          ? onRestoreMatch(match)
                          : handleDeletePress(match)
                      }
                    />
                    <Button
                      mode="contained"
                      onPress={() => {
                        onSelectMatch(match);
                        onDismiss();
                      }}
                      style={styles.selectButton}>
                      Select
                    </Button>
                  </View>
                )}
                style={[
                  styles.matchItem,
                  selectedMatch?.id === match.id && styles.selectedMatch,
                  match.hidden && styles.hiddenMatch,
                ]}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={onAddMatch}
              icon="plus"
              style={styles.addButton}>
              Add New Match
            </Button>
          </View>
        </View>

        <DeleteMatchDialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          match={matchToDelete}
          onDelete={handleConfirmDelete}
          onArchive={handleArchive}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 8,
    height: '90%',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  matchItem: {
    paddingVertical: 4,
  },
  selectedMatch: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  hiddenMatch: {
    opacity: 0.7,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  addButton: {
    width: '100%',
  },
});

export default MatchSelectorModal;
