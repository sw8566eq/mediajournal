# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # also runs postinstall -> electron-builder install-app-deps,
                   # which rebuilds better-sqlite3's native binding against Electron's Node ABI
npm run dev        # vite dev server + Electron launch with HMR (main/preload/renderer all watched)
npm run build       # typecheck (both tsconfigs) -> vite build -> electron-builder package
```

Typecheck only (no build output), since renderer and main/preload use separate tsconfigs targeting different environments (DOM vs Node):
```bash
npx tsc -p tsconfig.json --noEmit        # renderer
npx tsc -p tsconfig.node.json --noEmit   # main + preload
```

`npm run lint` and `npm test` are defined in package.json (eslint, vitest) but neither is wired up yet: eslint isn't installed as a dependency and there are no test files. Set these up before relying on them.

### Headless DB testing without a display

`better-sqlite3` is a native module rebuilt against **Electron's** Node ABI (via the postinstall step), not the host Node's. A plain `node script.js` that `require('better-sqlite3')` will fail with a `NODE_MODULE_VERSION` mismatch. To exercise the DB layer directly (e.g. testing migrations/repositories without launching the GUI), run the script through Electron's own bundled Node runtime instead:
```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron path/to/script.js
```
This requires no display/X server, unlike actually launching the Electron app.

## Architecture

Electron app tracking movies, TV, books, music, and games with ratings, status, notes, and a shared tag system. Three-process Electron split, all under `src/`:

- **`src/main/`** — Node/Electron main process: SQLite access, migrations, IPC handlers.
- **`src/preload/`** — contextBridge script; the only bridge between renderer and main.
- **`src/renderer/`** — React UI (Vite).
- **`src/shared/`** — types, IPC channel name constants, and zod validation schemas imported by *both* main and renderer. Must stay free of Node-only and DOM-only APIs.

### IPC contract

The renderer never touches `ipcRenderer` directly. `src/preload/preload.ts` exposes a typed `window.mediaJournalAPI` (shape defined by `MediaJournalAPI` in `src/shared/types.ts`) via `contextBridge`. Channel name strings live in `src/shared/ipcChannels.ts` as the single source of truth for both sides. Main-process handlers (`src/main/ipc/`) validate every payload with a zod schema from `src/shared/validation.ts` before it reaches the DB layer. Security baseline: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (see `src/main/window.ts`) — do not weaken this to pass data across the boundary; extend the typed channel/schema pattern instead.

### Database

better-sqlite3, opened in `src/main/db/connection.ts` at `app.getPath('userData')/mediajournal.db` (WAL mode, `foreign_keys = ON`). Schema: **one table per media type** (`movies`, `tv_shows`, `books`, `albums`, `games`) rather than a single polymorphic entries table, and **five separate per-type junction tables** (`movie_tags`, `tv_show_tags`, etc.) rather than one polymorphic tag junction — this keeps real `FOREIGN KEY ... ON DELETE CASCADE` constraints per type instead of relying on application-level cleanup. `tags` itself is a single shared/global table, so tags are reusable across all media types.

Ratings are stored as `rating_tenths` (`INTEGER`, 0–100), not a float, specifically to avoid rounding drift — convert to/from the displayed `X.X/10` form only at the UI boundary. `external_id` and `cover_path` columns exist on every entry table but are unused in v1 — reserved for a future external-API metadata-autofill feature so that adding it won't require an awkward migration.

Migrations are numbered SQL files in `migrations/` (currently just `0001_init.sql`), applied transactionally and tracked in a `schema_migrations` table by `src/main/db/migrate.ts` on every app startup. **Add new migrations as new numbered files — never edit an already-applied migration file.**

### Repository/handler pattern (generic factory, not per-type duplication)

`src/main/db/repositories/mediaRepository.ts` exports `createMediaRepository(config)`, which builds the full list/get/create/update/delete + filter-query-building logic *once*. Each of `movies.ts`, `tvShows.ts`, `books.ts`, `albums.ts`, `games.ts` is just a thin config object (table name, junction table/column, type-specific column mapping) passed into that factory. The same pattern applies to IPC: `src/main/ipc/mediaHandlers.ts`'s `registerMediaHandlers()` factory wires the 5×CRUD channel set generically, called once per type from `src/main/ipc/registerHandlers.ts`.

**Adding a new media type means**: a new migration (table + junction table), a new repository config file, one more `registerMediaHandlers()` call, a `MediaType`/schema addition in `src/shared/types.ts` + `src/shared/validation.ts`, and a `TYPE_FIELDS`/`PRIMARY_FIELD` entry in `src/renderer/mediaTypeConfig.ts` — not five new near-duplicate UI components.

### Renderer

Config-driven rather than duplicated per type: `src/renderer/mediaTypeConfig.ts` defines each media type's type-specific fields (`TYPE_FIELDS`), its card byline field (`PRIMARY_FIELD`), and status labels; `src/renderer/components/entry/TypeSpecificFields.tsx` renders whichever field set applies based on that config, rather than having five separate `MovieFields`/`BookFields`/etc. components. There's no router — `App.tsx` holds view state (`library` / `form` / `detail`) directly and switches between `LibraryView`, `EntryForm`, and `EntryDetail`.

## Product scope

- Rating scale: 0.0–10.0 in 0.1 steps (stored as `rating_tenths` per above).
- Status: `planned` / `in_progress` / `completed` / `dropped`, plus start/finish dates.
- Filtering covers status, rating range, genre, tags, year, date range, and text search (title + notes, plain `LIKE`).
- Out of scope for v1 (deliberately not built yet): external API search/autofill, cover art upload/display, auth, cloud sync, stats/charts, CSV import/export.
