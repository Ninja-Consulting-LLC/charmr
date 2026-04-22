import React from 'react';
import {Pressable, StyleSheet, type ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {tokens} from '../tokens';

export type HeroChromeIconButtonProps = {
  icon: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
  iconSize?: number;
  /** Defaults to hero (white) on purple / glass */
  iconColor?: string;
};

/**
 * Icon button with hero (white) glyph — stack headers, GiftedChat chrome, etc.
 * For modal chrome (mint glyph) use `ModalIconButton`.
 */
export const HeroChromeIconButton: React.FC<HeroChromeIconButtonProps> = ({
  icon,
  onPress,
  testID,
  accessibilityLabel,
  style,
  iconSize = 24,
  iconColor = tokens.color.hero.text,
}) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={tokens.space.sm}
    style={({pressed}) => [
      styles.hit,
      {opacity: pressed ? 0.78 : 1},
      style,
    ]}>
    <Icon name={icon} size={iconSize} color={iconColor} />
  </Pressable>
);

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
