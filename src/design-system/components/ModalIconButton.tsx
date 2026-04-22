import React from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {tokens} from '../tokens';

export type ModalIconButtonProps = {
  icon: string;
  onPress: () => void;
  /** Minimum touch target (dp) */
  size?: number;
  testID?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

/**
 * Modal chrome icon (solid mint glyph; matches prior fallback when masked view was absent).
 */
export const ModalIconButton: React.FC<ModalIconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  testID,
  accessibilityLabel,
  style,
}) => {
  const iconSize = Math.max(20, Math.min(28, Math.round(size * 0.52)));
  const box = Math.max(iconSize + 2, Math.min(size, 44));

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={tokens.space.sm}
      style={({pressed}) => [
        styles.wrap,
        {
          minWidth: size,
          minHeight: size,
          opacity: pressed ? 0.78 : 1,
        },
        style,
      ]}>
      <View style={[styles.iconHost, {width: box, height: box}]}>
        <Icon name={icon} size={iconSize} color={tokens.color.accent.mint} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHost: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
