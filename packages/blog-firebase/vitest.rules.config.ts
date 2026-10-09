import { defineConfig } from 'vitest/config'

// Emulator-backed rules tests, run through `pnpm test:rules` (firebase emulators:exec)
export default defineConfig({
  test: {
    name: 'rules',
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000
  }
})
