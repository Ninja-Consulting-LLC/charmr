import React from 'react';
import {StyleSheet, View} from 'react-native';
import {IconButton, List, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {Match} from '../utils/matchUtils';

interface MatchSelectorProps {
  matches: Match[];
  selectedMatch: Match | null;
  onSelectMatch: (match: Match) => void;
  onAddMatch: () => void;
  onDeleteMatch: (match: Match) => void;
  userPlan: SubscriptionTier;
}

const MatchSelector: React.FC<MatchSelectorProps> = ({
  matches,
  selectedMatch,
  onSelectMatch,
  onAddMatch,
  onDeleteMatch,
  userPlan,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Sort matches by lastUsed date, most recent first
  const sortedMatches = React.useMemo(() => {
    return [...matches].sort((a, b) => {
      // If one of them is the selected match, put it first
      if (selectedMatch) {
        if (
          a.name === selectedMatch.name &&
          a.platform === selectedMatch.platform
        )
          return -1;
        if (
          b.name === selectedMatch.name &&
          b.platform === selectedMatch.platform
        )
          return 1;
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
      <View style={styles.header}>
        <Text variant="titleMedium">Select Match</Text>
        <IconButton
          icon="plus"
          onPress={onAddMatch}
          testID="add-match-button"
        />
      </View>
      {sortedMatches.length > 0 ? (
        <List.Accordion
          title={
            selectedMatch
              ? `${selectedMatch.name} (${selectedMatch.platform})`
              : 'Select a match'
          }
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
          testID="match-dropdown">
          {sortedMatches.map(match => (
            <List.Item
              key={`${match.platform}::${match.name}`}
              title={match.name}
              description={match.platform}
              right={props => (
                <IconButton
                  {...props}
                  icon="delete"
                  onPress={() => onDeleteMatch(match)}
                  testID={`delete-match-${match.name}`}
                />
              )}
              onPress={() => {
                onSelectMatch(match);
                setExpanded(false);
              }}
              testID={`match-${match.name}`}
            />
          ))}
        </List.Accordion>
      ) : (
        <Text>No matches added yet</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default MatchSelector;
