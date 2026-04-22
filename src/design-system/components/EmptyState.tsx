import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {CharmrButton} from './CharmrButton';
import {tokens} from '../tokens';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onActionPress,
}) => (
  <View style={styles.wrap} accessibilityRole="summary">
    <AppText variant="titleSm" color="hero" style={styles.title}>
      {title}
    </AppText>
    {description ? (
      <AppText variant="body" color="heroMuted" style={styles.desc}>
        {description}
      </AppText>
    ) : null}
    {actionLabel && onActionPress ? (
      <CharmrButton
        label={actionLabel}
        variant="secondary"
        onPress={onActionPress}
        style={styles.btn}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: tokens.space['3xl'],
    paddingHorizontal: tokens.space['2xl'],
    gap: tokens.space.sm,
  },
  title: {
    textAlign: 'center',
  },
  desc: {
    textAlign: 'center',
  },
  btn: {
    marginTop: tokens.space.md,
  },
});
