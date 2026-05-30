import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src/ui'],
    watch: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/ui/**'],
    },
  },
});
