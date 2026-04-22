import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {AppText, type AppTextProps} from './AppText';
import {tokens} from '../tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'heroEmphasis'
  | 'ghost'
  | 'ghostInk'
  | 'outline'
  | 'danger';

export type CharmrButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  /** Smaller control for dense rows (e.g. list actions) */
  compact?: boolean;
  /** Optional icon or avatar to the left of the label */
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function spinnerColor(variant: ButtonVariant): string {
  if (variant === 'primary') {
    return tokens.color.text.onAccent;
  }
  if (variant === 'ghostInk' || variant === 'danger') {
    return tokens.color.text.primary;
  }
  if (
    variant === 'outline' ||
    variant === 'secondary' ||
    variant === 'heroEmphasis' ||
    variant === 'ghost'
  ) {
    return tokens.color.accent.mint;
  }
  return tokens.color.hero.text;
}

const variantStyles: Record<
  ButtonVariant,
  {container: ViewStyle; labelColor: NonNullable<AppTextProps['color']>}
> = {
  primary: {
    container: {
      backgroundColor: tokens.color.accent.mint,
    },
    labelColor: 'onAccent',
  },
  secondary: {
    container: {
      backgroundColor: tokens.color.hero.glass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.color.hero.glassBorder,
    },
    labelColor: 'accent',
  },
  /** Primary CTA on purple hero — glass, not solid mint */
  heroEmphasis: {
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.32)',
    },
    labelColor: 'accent',
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    labelColor: 'accent',
  },
  /** Text-style control on dark ink surfaces (e.g. modal close) */
  ghostInk: {
    container: {
      backgroundColor: 'transparent',
    },
    labelColor: 'primary',
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: tokens.color.accent.mint,
    },
    labelColor: 'accent',
  },
  danger: {
    container: {
      backgroundColor: 'rgba(248, 113, 113, 0.2)',
      borderWidth: 1,
      borderColor: tokens.color.semantic.danger,
    },
    labelColor: 'danger',
  },
};

export const CharmrButton: React.FC<CharmrButtonProps> = ({
  label,
  variant = 'primary',
  loading,
  fullWidth,
  compact,
  leftIcon,
  disabled,
  style,
  ...rest
}) => {
  const v = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.base,
        compact && styles.compact,
        v.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={spinnerColor(variant)}
        />
      ) : (
        <View style={styles.labelRow}>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <AppText
            variant="bodyMedium"
            color={v.labelColor}
            style={compact ? styles.compactLabel : undefined}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 42,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 32,
    paddingVertical: tokens.space.xxs,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radii.md,
  },
  compactLabel: {
    fontSize: tokens.type.label.size,
    lineHeight: tokens.type.label.lineHeight,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
