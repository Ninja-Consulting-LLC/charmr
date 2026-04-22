import {MD3DarkTheme} from 'react-native-paper';
import {tokens} from './tokens';

/**
 * Paper subtree for inputs/buttons on purple-gradient `ModalSheet`.
 * Wrap modal body with `ThemeProvider` from react-native-paper.
 */
export const darkModalPaperTheme = {
  ...MD3DarkTheme,
  roundness: tokens.radii.paper,
  colors: {
    ...MD3DarkTheme.colors,
    /** Solid scrim — Paper Modal/Dialog read `backdrop` from the modal’s theme, not child ThemeProvider */
    backdrop: tokens.color.overlay.modalBackdrop,
    primary: tokens.color.accent.mint,
    onPrimary: tokens.color.text.onAccent,
    secondary: tokens.color.accent.mintMuted,
    background: 'transparent',
    surface: 'rgba(255, 255, 255, 0.18)',
    surfaceVariant: 'rgba(255, 255, 255, 0.12)',
    onSurface: tokens.color.hero.text,
    onSurfaceVariant: tokens.color.hero.textMuted,
    outline: 'rgba(255, 255, 255, 0.55)',
    outlineVariant: 'rgba(255, 255, 255, 0.36)',
    error: tokens.color.semantic.danger,
    onError: '#FFFFFF',
  },
};
