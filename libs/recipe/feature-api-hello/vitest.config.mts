import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: 'recipe-feature-api-hello',
    environment: 'node',
    watch: false,
  },
});
