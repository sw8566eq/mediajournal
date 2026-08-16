import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
      preload: {
        input: 'src/preload/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    // 'node' by default: most of the suite is pure logic with no DOM dependency (see CLAUDE.md's
    // "Headless testing without a display" section) - repository tests that need a real DB
    // connection are a separate, deliberately deferred investment (better-sqlite3's native binding
    // is built against Electron's Node ABI, not host Node's, so a real DB connection can't be
    // opened under plain `vitest run` regardless of environment). Component tests (.test.tsx) *do*
    // need a DOM - each of those files opts into `jsdom` itself via a leading
    // `// @vitest-environment jsdom` docblock, rather than flipping this default for everything.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
