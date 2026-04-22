import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {CharmrButton, ModalIconButton, tokens} from '../design-system';

interface FeedbackFabProps {
  onPress: () => void;
}

const HIDE_FEEDBACK_KEY = '@charmr/hideFeedbackUntil';

const FeedbackFab: React.FC<FeedbackFabProps> = ({onPress}) => {
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
      hideUntil.setDate(hideUntil.getDate() + 7);
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
        <CharmrButton
          label="Feedback"
          variant="primary"
          onPress={onPress}
          testID="feedback-button"
          style={styles.button}
        />
        <View style={styles.closeWrap}>
          <ModalIconButton
            icon="close"
            size={28}
            onPress={handleClose}
            testID="feedback-close-button"
            accessibilityLabel="Hide feedback"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: tokens.space.lg,
    bottom: tokens.space['4xl'],
    zIndex: 1,
  },
  buttonContainer: {
    position: 'relative',
  },
  button: {
    ...tokens.elevation.md,
  },
  closeWrap: {
    position: 'absolute',
    right: -tokens.space.sm,
    top: -tokens.space['2xl'],
    backgroundColor: tokens.color.hero.text,
    borderRadius: tokens.radii.full,
  },
});
