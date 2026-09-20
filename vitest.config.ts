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
    // The database-backed files share one remote Postgres and create and delete rows in it, so they
    // run one at a time: in parallel they contend for connections and can see each other's writes.
    fileParallelism: false,
    // Each database-backed file boots its own Payload and pulls the schema before its first test,
    // which against a remote database has been seen to take well over a minute on a slow run.
    hookTimeout: 180_000,
    testTimeout: 60_000,
  },
})
