import React from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {SurfaceCard} from './SurfaceCard';
import {tokens} from '../tokens';

type OutputCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Primary surface for model output (reply text, generated content) */
export const OutputCard: React.FC<OutputCardProps> = ({children, style}) => (
  <SurfaceCard tone="dark" padded style={[styles.card, style]}>
    {children}
  </SurfaceCard>
);

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
    marginBottom: tokens.space.lg,
  },
});
