import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [nxViteTsPaths()],
  test: {
    name: 'recipe-feature-api-recipes',
    watch: false,
    environment: 'node',
  },
});
