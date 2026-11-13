import { defineConfig } from 'vitest/config'

// Tests de reglas de Firestore: se ejecutan contra el emulador (pnpm test:rules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: false,
  },
})
