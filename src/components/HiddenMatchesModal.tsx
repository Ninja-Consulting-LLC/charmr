import React, {useState} from 'react';
import {ScrollView, StyleSheet, useWindowDimensions, View} from 'react-native';
import {
  Dialog,
  IconButton,
  List,
  Modal,
  Portal,
  ThemeProvider,
} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
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
  const {height: windowHeight} = useWindowDimensions();
  const sheetHeight = Math.min(Math.round(windowHeight * 0.85), 640);

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
                Archived matches
              </AppText>
              <ModalIconButton
                testID="archived-matches-close"
                icon="close"
                size={40}
                onPress={onDismiss}
                accessibilityLabel="Close"
              />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {hiddenMatches.length > 0 ? (
                hiddenMatches.map((match, index) => (
                  <List.Item
                    key={`${match.id}`}
                    testID={
                      index === 0
                        ? 'archived-match-first-row'
                        : `archived-match-row-${String(match.id)}`
                    }
                    title={
                      <AppText
                        variant="bodyMedium"
                        color="hero"
                        accessibilityLabel={match.name}>
                        {match.name}
                      </AppText>
                    }
                    description={
                      <AppText variant="caption" color="heroMuted">
                        {match.platform}
                      </AppText>
                    }
                    style={styles.matchItem}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon="archive"
                        color={tokens.color.hero.textMuted}
                      />
                    )}
                    right={() => (
                      <View style={styles.itemActions}>
                        <ModalIconButton
                          testID="hidden-match-delete-button"
                          icon="delete"
                          size={36}
                          onPress={() => handleDeletePress(match)}
                          style={styles.deleteButton}
                          accessibilityLabel="Delete match"
                        />
                        <CharmrButton
                          testID="hidden-match-restore-button"
                          label="Restore"
                          variant="secondary"
                          compact
                          onPress={() => onRestoreMatch(match)}
                        />
                      </View>
                    )}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <IconButton
                    icon="archive-off"
                    size={48}
                    iconColor={tokens.color.hero.textMuted}
                  />
                  <AppText variant="body" color="heroMuted" style={styles.emptyText}>
                    No archived matches
                  </AppText>
                </View>
              )}
            </ScrollView>
          </View>
        </ModalSheet>
      </Modal>

      <ThemeProvider theme={darkModalPaperTheme}>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Match</Dialog.Title>
          <Dialog.Content>
            <AppText variant="body" color="primary">
              Are you sure you want to delete {matchToDelete?.name}? This action
              cannot be undone.
            </AppText>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <CharmrButton
              testID="archived-delete-cancel-button"
              label="Cancel"
              variant="outline"
              compact
              onPress={() => setDeleteDialogVisible(false)}
            />
            <CharmrButton
              testID="archived-delete-confirm-button"
              label="Delete"
              variant="danger"
              compact
              onPress={handleConfirmDelete}
            />
          </View>
        </Dialog>
      </ThemeProvider>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.hero.glassBorder,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: tokens.space.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: tokens.space.xs,
  },
  matchItem: {
    paddingVertical: tokens.space.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: tokens.space.sm,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: tokens.space['2xl'],
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
  deleteButton: {
    margin: 0,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
  },
});

export default HiddenMatchesModal;
