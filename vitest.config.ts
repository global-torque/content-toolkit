import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/index.ts', 'src/types.ts'],
      thresholds: {
        statements: 90,
        lines: 90,
        branches: 85,
      },
    },
  },
});
