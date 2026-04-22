import React from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';
import {AppText, type AppTextProps} from './AppText';
import {tokens} from '../tokens';

export type FooterNavItemProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  /** Shown on the same row as the label (e.g. coach “live” dot) */
  labelAccessory?: React.ReactNode;
  /** Stronger label color for primary footer actions */
  labelColor?: AppTextProps['color'];
};

/**
 * Bottom tab-style control: icon above label (column), for hero gradient footers.
 */
export const FooterNavItem: React.FC<FooterNavItemProps> = ({
  icon,
  label,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint,
  style,
  labelAccessory,
  labelColor = 'heroMuted',
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({pressed}) => [styles.hit, pressed && styles.pressed, style]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={accessibilityHint}
    hitSlop={8}>
    <View style={styles.iconSlot}>{icon}</View>
    <View style={styles.labelRow}>
      <AppText variant="label" color={labelColor}>
        {label}
      </AppText>
      {labelAccessory}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xxs,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radii.md,
  },
  pressed: {
    opacity: 0.85,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
});
