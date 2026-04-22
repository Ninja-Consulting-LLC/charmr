import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {tokens} from '../tokens';

type LoadingStateProps = {
  label?: string;
  /** Spinner color on hero backgrounds */
  onHero?: boolean;
  /**
   * When false, does not use `flex: 1` — use inside overlays or fixed-height regions.
   * Default true for full-screen loading placeholders.
   */
  fill?: boolean;
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  label,
  onHero = true,
  fill = true,
}) => (
  <View
    style={[styles.wrap, !fill && styles.wrapInline]}
    accessibilityRole="progressbar">
    <ActivityIndicator
      size="large"
      color={onHero ? tokens.color.hero.text : tokens.color.brand.primary}
    />
    {label ? (
      <AppText variant="label" color="heroMuted" style={styles.label}>
        {label}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.md,
    padding: tokens.space.lg,
  },
  wrapInline: {
    flex: 0,
    flexGrow: 0,
  },
  label: {
    textAlign: 'center',
  },
});
