import { createElement } from 'react';
import type { Preview } from '@storybook/react-vite';
import '../src/styles/index.css';

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        'div',
        { 'data-density': 'comfortable', 'data-mode': 'light', 'data-theme': 'wasl' },
        createElement(Story),
      ),
  ],
};
export default preview;
