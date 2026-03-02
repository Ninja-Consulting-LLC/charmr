import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'CoachChat'>;

const CoachChatScreen: React.FC<Props> = ({navigation, route}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Coach Chat (Web Preview)</Text>
        <Text style={styles.text}>
          Chat UI is simplified for browser preview. Native-only camera roll,
          push, and advanced message tooling are disabled.
        </Text>
        <Text style={styles.matchName}>Match: {route.params.match.name}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1f0835',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 560,
  },
  title: {
    color: '#7E22CE',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    color: '#555',
    marginBottom: 12,
  },
  matchName: {
    fontWeight: '600',
    color: '#7E22CE',
    marginBottom: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cdbfe5',
  },
  buttonText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
});

export default CoachChatScreen;
