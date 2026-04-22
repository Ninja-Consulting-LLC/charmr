import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {tokens} from '../tokens';

export type ModalSheetProps = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
  /** Use when the sheet has a fixed height and inner `ScrollView` with `flex: 1`. */
  fillHeight?: boolean;
};

/**
 * Purple gradient modal body (matches Home hero). Use with `paperModalContent.shell`
 * or inside `rnModalOverlay`; pair with `darkModalPaperTheme` for Paper inputs.
 */
export const ModalSheet: React.FC<ModalSheetProps> = ({
  children,
  padded = true,
  fillHeight,
  style,
  ...rest
}) => (
  <View style={[styles.outer, tokens.elevation.lg, style]} {...rest}>
    {/* Clip gradient only — `overflow: hidden` on the sheet root clips Paper outlined
        TextInput floating labels that sit slightly above the field border. */}
    <View style={styles.gradientClip}>
      <LinearGradient
        colors={[tokens.color.brand.primary, tokens.color.brand.primaryStrong]}
        style={StyleSheet.absoluteFill}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
    </View>
    <View
      style={[
        styles.inner,
        padded && styles.padded,
        fillHeight && styles.innerFill,
      ]}
      pointerEvents="box-none">
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  outer: {
    borderRadius: tokens.radii.lg,
    overflow: 'visible',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
  },
  gradientClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radii.lg,
    overflow: 'hidden',
    zIndex: 0,
  },
  /** No `flex: 1` — avoids zero-height sheets when the outer sizes to content (RN transparent modals). */
  inner: {
    alignSelf: 'stretch',
    position: 'relative',
    zIndex: 1,
  },
  padded: {
    padding: tokens.space.lg,
  },
  innerFill: {
    flex: 1,
    minHeight: 0,
  },
});
