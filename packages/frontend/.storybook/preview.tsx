import type { Preview } from '@storybook/react-vite'
import '@fontsource/gabarito/700.css'
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css'
import './preview.css'

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Color', 'Tone', 'Primitives', 'Typography', 'Spacing and radius', 'Elevation', 'Motion'],
          'Components',
          ['Actions', 'Forms', 'Data display', 'Feedback', 'Overlays', 'Navigation', 'Icons'],
          'Patterns',
          'Layouts',
          'Screens',
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The canvas background comes from color/bg/canvas via base.css, so it follows the theme
    backgrounds: { disabled: true },
    // The Figma frame sizes. A story picks one with `globals: { viewport: { value: 'phone' } }`;
    // story tests resize the browser to match, so breakpoints apply in tests too.
    viewport: {
      options: {
        phone: { name: 'Phone (390)', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        desktop: { name: 'Desktop (1440)', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
      },
    },
    a11y: {
      // 'error' fails the story test on any axe violation; override per story with 'todo' or 'off'
      test: 'error',
    },
  },
  globalTypes: {
    theme: {
      description: 'Color scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  // Webfonts load lazily, so a play function can measure text in the fallback font. On Linux
  // (CI) that's DejaVu Sans, which is wide enough to wrap lines and change heights.
  loaders: [
    async () => {
      await Promise.all([
        document.fonts.load('700 16px "Gabarito"'),
        document.fonts.load('400 16px "Atkinson Hyperlegible Next Variable"'),
      ])
    },
  ],
  decorators: [
    // Tokens use light-dark(), so setting color-scheme switches every token.
    // A story can pin a mode with `globals: { theme: 'dark' }`.
    (Story, { globals, viewMode }) => {
      const scheme = globals.theme === 'dark' ? 'dark' : 'light'
      if (viewMode !== 'docs') {
        document.documentElement.style.colorScheme = scheme
        return <Story />
      }
      // A docs page renders every story in one document, so the scheme goes on a wrapper per
      // story; setting it on <html> would let the last story (usually Dark) theme them all.
      // The wrapper sets its own background and text color, since `color` resolves where it's set.
      document.documentElement.style.colorScheme = 'light'
      return (
        <div
          style={{
            colorScheme: scheme,
            background: 'var(--color-bg-canvas)',
            color: 'var(--color-text-primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Story />
        </div>
      )
    },
  ],
}

export default preview
