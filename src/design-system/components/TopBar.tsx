import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {tokens} from '../tokens';

type TopBarProps = {
  leading?: React.ReactNode;
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  /** Bottom border using hero glass border */
  showDivider?: boolean;
  /**
   * `balanced` — three columns (nav titles).
   * `titleStart` — leading + trailing with space-between (app chrome).
   */
  layout?: 'balanced' | 'titleStart';
};

export const TopBar: React.FC<TopBarProps> = ({
  leading,
  center,
  trailing,
  style,
  showDivider = true,
  layout = 'balanced',
}) => {
  const barStyle = [
    styles.bar,
    showDivider && {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.color.hero.glassBorder,
    },
    style,
  ];

  if (layout === 'titleStart' || !center) {
    return (
      <View style={barStyle}>
        <View style={styles.titleStartRow}>
          <View style={styles.titleStartLeading}>{leading}</View>
          <View style={styles.titleStartTrailing}>{trailing}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[barStyle, styles.balancedBar]}>
      <View style={styles.side}>{leading}</View>
      <View style={styles.center}>{center}</View>
      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  titleStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.md,
  },
  titleStartLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  titleStartTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailing: {
    justifyContent: 'flex-end',
  },
  center: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancedBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
