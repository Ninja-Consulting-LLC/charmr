/**
 * @format
 */

// Setup mocks before any imports
import '../src/test/setup';

// React and component imports
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
