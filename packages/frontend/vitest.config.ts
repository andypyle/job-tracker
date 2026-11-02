import { defineConfig, mergeConfig } from 'vitest/config'
import path from 'path'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config'

// Extends vite.config.ts so story tests get the same plugins as the app (React, Tailwind),
// which the axe color-contrast checks depend on.
// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            css: false,
          },
        },
        {
          extends: true,
          // Runs every story as a test: render, play function (interactions), and axe a11y checks
          plugins: [storybookTest({ configDir: path.join(__dirname, '.storybook') })],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
