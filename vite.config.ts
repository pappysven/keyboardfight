import { defineConfig } from 'vite';

// Le site est publié sur GitHub Pages sous /keyboardfight/ (voir docs/deploy.md).
export default defineConfig({
  base: '/keyboardfight/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
