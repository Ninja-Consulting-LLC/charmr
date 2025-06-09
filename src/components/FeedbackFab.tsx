import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, useTheme } from 'react-native-paper';
import { theme } from '../theme/theme';

interface FeedbackFabProps {
  onPress: () => void;
}

const HIDE_FEEDBACK_KEY = '@charmr/hideFeedbackUntil';

const FeedbackFab: React.FC<FeedbackFabProps> = ({onPress}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    try {
      const hideUntil = await AsyncStorage.getItem(HIDE_FEEDBACK_KEY);
      if (hideUntil) {
        const hideUntilDate = new Date(hideUntil);
        if (hideUntilDate > new Date()) {
          setIsVisible(false);
        } else {
          // Clear expired hide date
          await AsyncStorage.removeItem(HIDE_FEEDBACK_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking feedback visibility:', error);
    }
  };

  const handleClose = async () => {
    try {
      const hideUntil = new Date();
      hideUntil.setDate(hideUntil.getDate() + 7); // Hide for 7 days
      await AsyncStorage.setItem(HIDE_FEEDBACK_KEY, hideUntil.toISOString());
      setIsVisible(false);
    } catch (error) {
      console.error('Error hiding feedback button:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={onPress}
          style={[styles.button, {backgroundColor: theme.colors.secondary}]}
          labelStyle={styles.label}
          testID="feedback-button">
          Feedback
        </Button>
        <IconButton
          icon="close"
          size={14}
          style={styles.closeButton}
          onPress={handleClose}
          testID="feedback-close-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: '80%',
    transform: [{translateY: -50}],
    zIndex: 1,
  },
  buttonContainer: {
    position: 'relative',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 0,
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    transform: [{rotate: '-90deg'}],
    width: 140,
    marginRight: -55,
  },
  label: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    transform: [{rotate: '0deg'}],
    textAlign: 'center',
  },
  closeButton: {
    margin: 0,
    padding: 0,
    position: 'absolute',
    right: 0,
    top: -40,
  },
});

export default FeedbackFab;
