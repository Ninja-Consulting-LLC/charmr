import {MD3LightTheme} from 'react-native-paper';

// Our custom color palette
const colors = {
  primary: '#7E22CE',
  primaryContainer: '#3B0764',
  secondary: '#40E0D0', // Light turquoise
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#D32F2F',
  onSurface: '#000000',
  onSurfaceVariant: 'rgba(0, 0, 0, 0.6)',
  outline: 'rgba(0, 0, 0, 0.12)',
  disabled: 'rgba(0, 0, 0, 0.38)',
};

// Create a custom theme based on the light theme
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
  // Disable dark mode
  dark: false,
  // Customize other theme properties as needed
  roundness: 8,
  animation: {
    scale: 1.0,
  },
};

// Export the theme type for TypeScript
export type AppTheme = typeof theme;
