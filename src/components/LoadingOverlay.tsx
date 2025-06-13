import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({visible, message}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={theme.colors.surface} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${theme.colors.primary}B3`, // B3 is 70% opacity in hex
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  message: {
    color: theme.colors.surface,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoadingOverlay;
