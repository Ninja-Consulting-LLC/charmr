import React from 'react';
import {ScrollView, StyleSheet, useWindowDimensions, View} from 'react-native';
import {List, Modal, Portal} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
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
  onDeleteMatch: _onDeleteMatch,
  onHideMatch,
  onRestoreMatch: _onRestoreMatch,
  onUpdateMatch,
  userPlan: _userPlan,
}) => {
  const {height: windowHeight} = useWindowDimensions();
  const sheetHeight = Math.min(Math.round(windowHeight * 0.85), 640);

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
        await onUpdateMatch(String(matchToEdit.id), name, platform);
        setMatchToEdit(null);
      } else {
        await onAddMatch(name, platform);
      }
      setShowAddMatchModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleMatches = matches
    .filter(match => !match.hidden && match.name !== 'No Match')
    .sort(compareMatchesByLastUsedDesc);

  return (
    <Portal>
      <Modal
        visible={visible && !showAddMatchModal}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ModalSheet
          padded={false}
          fillHeight
          style={[styles.sheet, {height: sheetHeight, minHeight: 280}]}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <AppText variant="titleSm" color="hero">
                Your matches
              </AppText>
              <ModalIconButton
                testID="match-selector-close"
                icon="close"
                size={40}
                onPress={onDismiss}
                accessibilityLabel="Close"
              />
            </View>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {visibleMatches.length === 0 ? (
                <View style={styles.emptyState}>
                  <AppText variant="body" color="heroMuted" style={styles.emptyText}>
                    You do not have any matches yet. Add one to start coaching.
                  </AppText>
                </View>
              ) : (
                visibleMatches.map((match, index) => (
                  <List.Item
                    key={match.id}
                    testID={
                      index === 0
                        ? 'match-list-first-row'
                        : `match-list-item-${String(match.id)}`
                    }
                    accessibilityLabel={match.name}
                    title={
                      <AppText
                        testID="match-list-item-title"
                        variant="bodyMedium"
                        color="hero"
                        accessibilityLabel={match.name}>
                        {match.name}
                      </AppText>
                    }
                    description={
                      <AppText variant="caption" color="heroMuted">
                        {match.platform.charAt(0).toUpperCase() +
                          match.platform.slice(1)}
                      </AppText>
                    }
                    style={[
                      styles.matchItem,
                      selectedMatch?.id === match.id && styles.selectedMatch,
                    ]}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon="account"
                        color={tokens.color.accent.mint}
                      />
                    )}
                    right={() => (
                      <View style={styles.itemActions}>
                        <ModalIconButton
                          testID="match-edit-button"
                          icon="pencil"
                          size={36}
                          onPress={() => handleEditPress(match)}
                          accessibilityLabel="Edit match"
                          style={styles.actionButton}
                        />
                        <ModalIconButton
                          testID="match-archive-button"
                          icon="archive"
                          size={36}
                          onPress={() => handleArchivePress(match)}
                          accessibilityLabel="Archive match"
                          style={styles.actionButton}
                        />
                        <CharmrButton
                          testID="match-row-select-button"
                          label="Select"
                          variant="secondary"
                          compact
                          onPress={() => onSelectMatch(match)}
                          style={styles.selectButton}
                        />
                      </View>
                    )}
                  />
                ))
              )}
            </ScrollView>
            <View style={styles.footer}>
              <CharmrButton
                label="Add a match"
                variant="heroEmphasis"
                fullWidth
                onPress={() => setShowAddMatchModal(true)}
              />
            </View>
          </View>
        </ModalSheet>
      </Modal>

      <ArchiveMatchDialog
        visible={archiveDialogVisible}
        onDismiss={() => setArchiveDialogVisible(false)}
        onArchive={handleConfirmArchive}
        matchName={matchToArchive?.name || ''}
      />

      <AddEditMatchModal
        visible={visible && showAddMatchModal}
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

      <LoadingOverlay visible={isLoading} message="Saving match..." />
    </Portal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
  },
  inner: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.hero.glassBorder,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: tokens.space.xs,
  },
  emptyState: {
    padding: tokens.space['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  matchItem: {
    paddingVertical: tokens.space.xs,
  },
  selectedMatch: {
    backgroundColor: tokens.color.accent.mintMuted,
    borderRadius: tokens.radii.sm,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
  actionButton: {
    marginVertical: 0,
  },
  selectButton: {
    marginLeft: tokens.space.xs,
  },
  footer: {
    padding: tokens.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.hero.glassBorder,
  },
});

export default MatchSelectorModal;
