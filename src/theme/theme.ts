import {MD3LightTheme} from 'react-native-paper';
import {tokens} from '../design-system/tokens';

const c = tokens.color;

// Light Paper theme for unmigrated surfaces; brand colors align with design tokens.
export const theme = {
  ...MD3LightTheme,
  dark: false,
  roundness: tokens.radii.paper,
  animation: {
    scale: 1.0,
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: c.brand.primary,
    /** Deep purple — used in hero gradients (Login, Coach) */
    primaryContainer: c.brand.primaryStrong,
    onPrimary: '#FFFFFF',
    secondary: c.accent.mint,
    secondaryContainer: '#CCFBF1',
    onSecondary: c.text.onAccent,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F4F4F5',
    /** Legacy screens expect true black for primary button labels */
    onSurface: '#000000',
    onSurfaceVariant: '#52525B',
    outline: '#E4E4E7',
    outlineVariant: '#D4D4D8',
    error: c.semantic.danger,
    onError: '#FFFFFF',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  components: {
    ...(MD3LightTheme as {components?: object}).components,
    Snackbar: {
      style: {
        backgroundColor: 'rgba(49, 48, 51, 0.95)',
      },
    },
  },
};

export type AppTheme = typeof theme;
