import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'edge-runtime',
    setupFiles: ['./vitest.setup.ts'],
    server: { deps: { inline: ['convex-test'] } },
    exclude: ['**/node_modules/**', '**/dist/**', '**/playwright/**', '**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '~': path.resolve(__dirname, './'),
    },
  },
}) 