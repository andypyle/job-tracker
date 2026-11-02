import type { Preview } from '@storybook/react-vite'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error' fails the story test on any axe violation; override per story with 'todo' or 'off'
      test: 'error',
    },
  },
}

export default preview
