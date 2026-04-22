import React from 'react';
import {
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';
import {tokens} from '../tokens';

const variantMap = {
  display: tokens.type.display,
  title: tokens.type.title,
  titleSm: tokens.type.titleSm,
  body: tokens.type.body,
  bodyMedium: tokens.type.bodyMedium,
  label: tokens.type.label,
  caption: tokens.type.caption,
  overline: tokens.type.overline,
} as const;

type Variant = keyof typeof variantMap;

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'hero'
  | 'heroMuted'
  | 'onAccent'
  | 'accent'
  | 'danger';

const colorMap: Record<TextColor, string> = {
  primary: tokens.color.text.primary,
  secondary: tokens.color.text.secondary,
  tertiary: tokens.color.text.tertiary,
  hero: tokens.color.hero.text,
  heroMuted: tokens.color.hero.textMuted,
  onAccent: tokens.color.text.onAccent,
  accent: tokens.color.accent.mint,
  danger: tokens.color.semantic.danger,
};

const letterSpacingMap: Record<Variant, number> = {
  display: -0.4,
  title: -0.2,
  titleSm: -0.1,
  body: 0.1,
  bodyMedium: 0.1,
  label: 0.2,
  caption: 0.2,
  overline: 0.6,
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: TextColor;
  children: React.ReactNode;
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = 'primary',
  style,
  children,
  maxFontSizeMultiplier = tokens.a11y.maxFontSizeMultiplier,
  ...rest
}) => {
  const t = variantMap[variant];
  const textStyle: TextStyle = {
    fontSize: t.size,
    lineHeight: t.lineHeight,
    fontWeight: t.weight,
    letterSpacing: letterSpacingMap[variant],
    color: colorMap[color],
  };
  return (
    <Text
      style={[textStyle, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}>
      {children}
    </Text>
  );
};
