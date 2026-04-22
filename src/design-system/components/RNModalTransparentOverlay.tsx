import React from 'react';
import {Keyboard, Pressable, StyleSheet, View} from 'react-native';
import {tokens} from '../tokens';

export type RNModalTransparentOverlayProps = {
  children: React.ReactNode;
  /** Default: dismiss keyboard. Set `undefined` to disable backdrop tap. */
  onBackdropPress?: (() => void) | undefined;
};

const backdropColor = tokens.color.overlay.modalBackdrop;

/**
 * React Native `Modal` with `transparent` — dim layer + centered sheet.
 * Backdrop is a sibling **behind** the sheet so it does not participate in flex
 * layout with the sheet (fixes invisible / zero-height sheets) and does not steal
 * touches from the sheet.
 */
export const RNModalTransparentOverlay: React.FC<
  RNModalTransparentOverlayProps
> = ({children, onBackdropPress = () => Keyboard.dismiss()}) => (
  <View style={styles.fill}>
    <Pressable
      style={[StyleSheet.absoluteFillObject, {backgroundColor: backdropColor}]}
      onPress={onBackdropPress}
      accessible={false}
    />
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <View style={styles.sheetHost}>{children}</View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  sheetHost: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
  },
});
