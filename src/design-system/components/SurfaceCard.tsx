import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {tokens} from '../tokens';

type SurfaceTone = 'dark' | 'heroGlass' | 'light';

const toneBackground: Record<SurfaceTone, string> = {
  dark: tokens.color.surface.default,
  heroGlass: tokens.color.hero.glass,
  light: tokens.color.surface.inverse,
};

type SurfaceCardProps = ViewProps & {
  children: React.ReactNode;
  tone?: SurfaceTone;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  tone = 'dark',
  padded = true,
  style,
  ...rest
}) => (
  <View
    style={[
      styles.card,
      {backgroundColor: toneBackground[tone]},
      padded && styles.padded,
      tone === 'dark' && {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.color.border.subtle,
      },
      tone === 'heroGlass' && {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.color.hero.glassBorder,
      },
      tokens.elevation.sm,
      style,
    ]}
    {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radii.lg,
  },
  padded: {
    padding: tokens.space.lg,
  },
});
