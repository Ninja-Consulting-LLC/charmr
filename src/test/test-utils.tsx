import {NavigationContainer} from '@react-navigation/native';
import {render, RenderOptions} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import {StoreProvider} from '../store';
import {theme} from '../theme/theme';

// Custom render function that wraps components with necessary providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({children}) => (
      <NavigationContainer>
        <StoreProvider>
          <PaperProvider theme={theme}>{children}</PaperProvider>
        </StoreProvider>
      </NavigationContainer>
    ),
    ...options,
  });
}

// Re-export everything from @testing-library/react-native
export * from '@testing-library/react-native';
