# Media Journal

A personal desktop app for tracking movies, TV shows, books, music, and games you've watched, read, listened to, or played — with ratings, status, notes, tags, and cover art.

> **About this project.** This app is a test of [Claude Code](https://claude.com/claude-code)'s ability to build and evolve a real desktop application end to end — from an empty repository through a growing feature set — spanning Electron, React, SQLite, and integration with external web APIs. The entire codebase, including this document, was written by Claude Code.

## Download

Prebuilt Linux AppImage: see [Releases](https://github.com/sw8566eq/mediajournal/releases) — download, `chmod +x`, and run (no install needed). macOS/Windows builds aren't published yet; see "Building a package" below to build your own.

## Features

- Separate library views for Movies, TV, Books, Music, and Games, plus a combined "All" view spanning every type at once
- 10-point rating scale (e.g. `8.2/10`), status tracking (Planned / In Progress, or left blank to mean finished), and free-text notes per entry
- Shared tags across all media types — right-click a tag chip to rename or delete it — plus a free-text genre per entry, with a Genre manager in Settings to merge inconsistent casing/typos across your whole library
- Cover art, either picked from a local file or fetched from a URL, with autofill from an external database by title — currently live for Books (Open Library) and Music (MusicBrainz); Movies/TV (TMDB) and Games (RAWG) are wired up in the architecture but waiting on API keys
- Filter by status, rating range, genre, tags, and year; full-text search by title/notes; sort by multiple fields — save any combination as a named preset and reload it later
- Right-click an entry card for quick Edit/Delete, or multi-select entries for bulk delete/tag
- A non-blocking warning when adding an entry that looks like one you already have
- Stats dashboard — entries by type/status, rating distribution, top genres, entries added per year, and per-type totals (hours played, pages read, etc.)
- Export your library to JSON (metadata only) or a full `.zip` backup that also bundles your cover art, and import either back in — additive, never overwrites existing data; per-type CSV export for spreadsheets
- Import an existing Goodreads or Letterboxd export (titles, ratings, and dates) as a starting library
- Keyboard shortcuts — `/` to jump to search, `n` to start a new entry
- Light/dark theme, or follow your system setting
- Local-only storage — your data stays on your machine (SQLite)

## Tech stack

- [Electron](https://www.electronjs.org/) desktop shell
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) for the UI
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- TypeScript throughout, with a typed IPC contract between the renderer and main process
- [Open Library](https://openlibrary.org/dev/docs/api/search) and [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) for external metadata autofill
- [Recharts](https://recharts.org/) for the stats dashboard's charts
- [papaparse](https://www.papaparse.com/) for CSV import/export, [adm-zip](https://github.com/cthackers/adm-zip) for the full cover-art backup

## Getting started

```bash
npm install
npm run dev
```

`npm install` also rebuilds the native SQLite binding against Electron's bundled Node version — this can take a minute the first time.

`npm run dev` starts the app with hot reload.

### Building a package

```bash
npm run build
```

Produces a platform installer/package via `electron-builder`.

### Linting & tests

```bash
npm run lint
npm test
```

CI (GitHub Actions) runs both on every push/PR to `main`.

## Project status

Actively developed, first release (`v0.1.0`) published. Core tracking, rating, notes, filtering, full-text search, the combined "All" view, cover art, external-database autofill (for two of five media types so far), tag and genre management, bulk actions, right-click quick actions, JSON and full cover-art backup/restore, CSV export, importing from Goodreads/Letterboxd, saved filter presets, a stats dashboard, and light/dark theming are all in place. Not yet built: TMDB/RAWG autofill (needs API keys) and cloud sync.
