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
import {Match} from '../utils/matchUtils';

interface HiddenMatchesModalProps {
  visible: boolean;
  onDismiss: () => void;
  hiddenMatches: Match[];
  onRestoreMatch: (match: Match) => void;
}

const HiddenMatchesModal: React.FC<HiddenMatchesModalProps> = ({
  visible,
  onDismiss,
  hiddenMatches,
  onRestoreMatch,
}) => {
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
                  <Button
                    mode="text"
                    onPress={() => onRestoreMatch(match)}
                    icon="restore">
                    Restore
                  </Button>
                )}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No hidden matches</Text>
          )}
        </ScrollView>
      </Modal>
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
});

export default HiddenMatchesModal;
