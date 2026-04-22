import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {tokens} from '../tokens';

type BadgeTone = 'neutral' | 'accent' | 'danger';

const toneStyle: Record<BadgeTone, {bg: string; fg: string}> = {
  neutral: {
    bg: tokens.color.hero.glass,
    fg: tokens.color.hero.text,
  },
  accent: {
    bg: tokens.color.accent.mintMuted,
    fg: tokens.color.accent.mint,
  },
  danger: {
    bg: 'rgba(248, 113, 113, 0.2)',
    fg: tokens.color.semantic.danger,
  },
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export const Badge: React.FC<BadgeProps> = ({label, tone = 'neutral'}) => {
  const t = toneStyle[tone];
  return (
    <View style={[styles.badge, {backgroundColor: t.bg}]}>
      <AppText variant="caption" style={{color: t.fg}}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xxs,
    borderRadius: tokens.radii.full,
  },
});
