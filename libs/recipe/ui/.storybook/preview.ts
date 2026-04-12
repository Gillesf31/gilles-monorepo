import type { Preview } from '@storybook/angular';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light-gray',
      values: [
        { name: 'light-gray', value: '#f9fafb' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
