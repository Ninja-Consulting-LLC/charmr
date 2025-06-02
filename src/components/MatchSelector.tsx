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
import AddEditMatchModal from './AddEditMatchModal';
import ArchiveMatchDialog from './ArchiveMatchDialog';

interface MatchSelectorModalProps {
  visible: boolean;
  onDismiss: () => void;
  matches: Match[];
  selectedMatch: Match | null;
  onSelectMatch: (match: Match) => void;
  onAddMatch: (name: string, platform: string) => void;
  onDeleteMatch: (matchId: string) => void;
  onHideMatch: (match: Match) => void;
  onRestoreMatch: (match: Match) => void;
  onUpdateMatch: (
    matchId: string,
    name: string,
    platform: string,
  ) => Promise<void>;
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
  onUpdateMatch,
  userPlan,
}) => {
  const [archiveDialogVisible, setArchiveDialogVisible] = React.useState(false);
  const [matchToArchive, setMatchToArchive] = React.useState<Match | null>(
    null,
  );
  const [showAddMatchModal, setShowAddMatchModal] = React.useState(false);
  const [matchToEdit, setMatchToEdit] = React.useState<Match | null>(null);

  const handleArchivePress = (match: Match) => {
    setMatchToArchive(match);
    setArchiveDialogVisible(true);
  };

  const handleEditPress = (match: Match) => {
    setMatchToEdit(match);
    setShowAddMatchModal(true);
  };

  const handleConfirmArchive = () => {
    if (matchToArchive) {
      onHideMatch(matchToArchive);
      setArchiveDialogVisible(false);
      setMatchToArchive(null);
    }
  };

  const handleAddMatch = async (name: string, platform: string) => {
    if (matchToEdit) {
      await onUpdateMatch(String(matchToEdit.id), name, platform);
      setMatchToEdit(null);
    } else {
      await onAddMatch(name, platform);
    }
    setShowAddMatchModal(false);
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
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>
          <ScrollView style={styles.scrollView}>
            {sortedMatches.map(match => (
              <List.Item
                key={match.id}
                title={match.name}
                description={match.platform}
                style={[
                  styles.matchItem,
                  selectedMatch?.id === match.id && styles.selectedMatch,
                ]}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="account"
                    color={theme.colors.primary}
                  />
                )}
                right={props => (
                  <View style={styles.itemActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditPress(match)}
                      style={styles.actionButton}
                    />
                    <IconButton
                      icon="archive"
                      size={20}
                      onPress={() => handleArchivePress(match)}
                      style={styles.actionButton}
                    />
                    <Button
                      mode="text"
                      onPress={() => onSelectMatch(match)}
                      style={styles.selectButton}>
                      Select
                    </Button>
                  </View>
                )}
              />
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={() => setShowAddMatchModal(true)}
              style={styles.addButton}>
              Add New Match
            </Button>
          </View>
        </View>
      </Modal>

      <ArchiveMatchDialog
        visible={archiveDialogVisible}
        onDismiss={() => setArchiveDialogVisible(false)}
        onArchive={handleConfirmArchive}
        matchName={matchToArchive?.name || ''}
      />

      <AddEditMatchModal
        visible={showAddMatchModal}
        onDismiss={() => {
          setShowAddMatchModal(false);
          setMatchToEdit(null);
        }}
        onAddMatch={handleAddMatch}
        isEditing={!!matchToEdit}
        initialName={matchToEdit?.name}
        initialPlatform={matchToEdit?.platform}
        onUpdateMatch={
          matchToEdit
            ? async (name: string, platform: string) =>
                await onUpdateMatch(String(matchToEdit.id), name, platform)
            : undefined
        }
      />
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
  actionButton: {
    marginRight: 8,
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
