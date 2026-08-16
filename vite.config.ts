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
    // 'node', not 'jsdom': the initial test suite is scoped to pure logic with no DOM dependency
    // (see CLAUDE.md's "Headless testing without a display" section) - repository/component tests
    // that need a real DB connection or DOM are a separate, deliberately deferred investment.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
