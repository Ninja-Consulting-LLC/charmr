import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {tokens} from '../tokens';

/** Bordered container for contextual hints on hero (purple) backgrounds */
export const ContextBlock: React.FC<ViewProps> = ({
  style,
  children,
  ...rest
}) => (
  <View style={[styles.box, style]} {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  box: {
    width: '100%',
    padding: tokens.space.md,
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.color.hero.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
  },
});
