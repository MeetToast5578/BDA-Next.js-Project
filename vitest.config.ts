import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '')

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Booting Payload and pushing the schema on first run can take a while.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
})
