import React from 'react';
import {StyleSheet, View} from 'react-native';
import {IconButton, List, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {Match} from '../utils/matchUtils';
import DeleteMatchDialog from './DeleteMatchDialog';

interface MatchSelectorProps {
  matches: Match[];
  selectedMatch: Match | null;
  onSelectMatch: (match: Match) => void;
  onAddMatch: () => void;
  onDeleteMatch: (match: Match) => void;
  onHideMatch: (match: Match) => void;
  onRestoreMatch: (match: Match) => void;
  userPlan: SubscriptionTier;
}

const MatchSelector: React.FC<MatchSelectorProps> = ({
  matches,
  selectedMatch,
  onSelectMatch,
  onAddMatch,
  onDeleteMatch,
  onHideMatch,
  onRestoreMatch,
  userPlan,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [matchToDelete, setMatchToDelete] = React.useState<Match | null>(null);

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
    <View style={styles.container}>
      <List.Section>
        <List.Subheader style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Matches</Text>
            <IconButton
              icon="plus"
              size={20}
              onPress={onAddMatch}
              style={styles.addButton}
            />
          </View>
        </List.Subheader>

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
                  match.hidden ? theme.colors.disabled : theme.colors.primary
                }
              />
            )}
            right={props => (
              <IconButton
                {...props}
                icon={match.hidden ? 'restore' : 'dots-vertical'}
                onPress={() =>
                  match.hidden
                    ? onRestoreMatch(match)
                    : handleDeletePress(match)
                }
              />
            )}
            onPress={() => onSelectMatch(match)}
            style={[
              styles.matchItem,
              selectedMatch?.id === match.id && styles.selectedMatch,
              match.hidden && styles.hiddenMatch,
            ]}
          />
        ))}
      </List.Section>

      <DeleteMatchDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        match={matchToDelete}
        onDelete={handleConfirmDelete}
        onArchive={handleArchive}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingVertical: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    margin: 0,
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
});

export default MatchSelector;
