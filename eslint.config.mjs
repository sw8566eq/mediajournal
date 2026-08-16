// Flat ESLint config (ESLint 9 / typescript-eslint 8). Named `.mjs` rather than `.js` since
// package.json has no `"type": "module"` - that field intentionally stays unset because flipping
// it globally risks Electron misinterpreting the CommonJS-compiled dist-electron/main/*.js output
// as ESM at launch (see tsconfig.node.json's `module: "CommonJS"`). Scoping the ESM opt-in to just
// this one config file avoids that blast radius.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const tsFiles = ['src/**/*.ts', 'src/**/*.tsx'];
const rendererFiles = ['src/renderer/**/*.ts', 'src/renderer/**/*.tsx'];
const mainFiles = ['src/main/**/*.ts', 'src/preload/**/*.ts'];
const sharedFiles = ['src/shared/**/*.ts'];

export default [
  { ignores: ['node_modules/**', 'dist/**', 'dist-electron/**', 'release/**'] },

  // Base JS/TS rules for every source file under src/.
  { files: tsFiles, rules: js.configs.recommended.rules },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: tsFiles })),

  // Renderer: React UI running in the browser-like Electron renderer process (DOM globals).
  {
    files: rendererFiles,
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules, // new JSX transform - no `React` in scope needed
      'react/prop-types': 'off', // prop shapes are enforced by TypeScript, not this rule
      // Only the two classic hooks rules, not the plugin's packaged `recommended`/`recommended-latest`
      // presets: eslint-plugin-react-hooks v7 bundles ~15 additional rules (set-state-in-effect,
      // purity, immutability, static-components, ...) written for React Compiler adoption, which
      // this codebase doesn't use. Those flag legitimate, idiomatic patterns already here as errors
      // - e.g. useEntries/useTags' standard "fetch on mount" `useEffect(() => { refetch(); }, [refetch])`
      // trips `set-state-in-effect`. rules-of-hooks/exhaustive-deps are the two that matter regardless
      // of Compiler adoption, and are what the codebase's existing
      // `// eslint-disable-next-line react-hooks/exhaustive-deps` comments already anticipate.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },

  // Main + preload: Node/Electron main process - Node globals, no DOM, no React.
  {
    files: mainFiles,
    languageOptions: { globals: globals.node },
  },

  // Shared: imported by BOTH main and renderer (see CLAUDE.md) - must stay environment-agnostic,
  // so neither browser nor node globals are granted here.
  {
    files: sharedFiles,
  },

  // Project-wide rule tweaks.
  {
    files: tsFiles,
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
