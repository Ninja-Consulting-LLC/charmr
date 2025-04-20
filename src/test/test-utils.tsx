import {render, RenderOptions} from '@testing-library/react-native';
import React from 'react';
import {PaperProvider} from 'react-native-paper';
import {StoreProvider} from '../store';

// Custom render function that wraps components with necessary providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({children}) => (
      <StoreProvider>
        <PaperProvider>{children}</PaperProvider>
      </StoreProvider>
    ),
    ...options,
  });
}

// Re-export everything from @testing-library/react-native
export * from '@testing-library/react-native';
