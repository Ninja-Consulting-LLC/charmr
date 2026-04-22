import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AppText, tokens} from '../design-system';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({visible, message}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={tokens.color.hero.text} />
      {message ? (
        <AppText variant="bodyMedium" color="hero" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${tokens.color.brand.primary}B3`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  message: {
    marginTop: tokens.space.lg,
  },
});

export default LoadingOverlay;
