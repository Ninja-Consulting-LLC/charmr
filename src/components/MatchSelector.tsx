import React from 'react';
import {ScrollView, StyleSheet, Text as RNText, View} from 'react-native';
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
import {Match, compareMatchesByLastUsedDesc} from '../utils/matchUtils';
import AddEditMatchModal from './AddEditMatchModal';
import ArchiveMatchDialog from './ArchiveMatchDialog';
import LoadingOverlay from './LoadingOverlay';

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
  const [isLoading, setIsLoading] = React.useState(false);

  const handleArchivePress = (match: Match) => {
    setMatchToArchive(match);
    setArchiveDialogVisible(true);
  };

  const handleEditPress = (match: Match) => {
    setMatchToEdit(match);
    setShowAddMatchModal(true);
  };

  const handleConfirmArchive = async () => {
    if (matchToArchive) {
      setIsLoading(true);
      try {
        await onHideMatch(matchToArchive);
        setArchiveDialogVisible(false);
        setMatchToArchive(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddMatch = async (name: string, platform: string) => {
    setIsLoading(true);
    try {
      if (matchToEdit) {
        console.log('[DEBUG] MatchSelectorModal onUpdateMatch', {
          id: matchToEdit.id,
          name,
          platform,
        });
        await onUpdateMatch(String(matchToEdit.id), name, platform);
        setMatchToEdit(null);
      } else {
        console.log('[DEBUG] MatchSelectorModal onAddMatch', {name, platform});
        await onAddMatch(name, platform);
      }
      setShowAddMatchModal(false);
    } finally {
      setIsLoading(false);
    }
  };

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
              testID="match-selector-close"
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>
          <ScrollView style={styles.scrollView}>
            {matches
              .filter(match => !match.hidden && match.name !== 'No Match')
              .sort(compareMatchesByLastUsedDesc)
              .map((match, index) => (
                <List.Item
                  key={match.id}
                  testID={
                    index === 0
                      ? 'match-list-first-row'
                      : `match-list-item-${String(match.id)}`
                  }
                  accessibilityLabel={match.name}
                  title={
                    <RNText
                      testID="match-list-item-title"
                      accessibilityLabel={match.name}>
                      {match.name}
                    </RNText>
                  }
                  description={
                    match.platform.charAt(0).toUpperCase() +
                    match.platform.slice(1)
                  }
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
                        testID="match-edit-button"
                        icon="pencil"
                        size={20}
                        onPress={() => handleEditPress(match)}
                        style={styles.actionButton}
                      />
                      <IconButton
                        testID="match-archive-button"
                        icon="archive"
                        size={20}
                        onPress={() => handleArchivePress(match)}
                        style={styles.actionButton}
                      />
                      <Button
                        testID="match-row-select-button"
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

      <LoadingOverlay visible={isLoading} message="Updating match..." />
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
