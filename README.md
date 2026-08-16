# Media Journal

A personal desktop app for tracking movies, TV shows, books, music, and games you've watched, read, listened to, or played — with ratings, status, notes, tags, and cover art.

> **About this project.** This app is a test of [Claude Code](https://claude.com/claude-code)'s ability to build and evolve a real desktop application end to end — from an empty repository through a growing feature set — spanning Electron, React, SQLite, and integration with external web APIs. The entire codebase, including this document, was written by Claude Code.

## Features

- Separate library views for Movies, TV, Books, Music, and Games
- 10-point rating scale (e.g. `8.2/10`)
- Status tracking (Planned / In Progress, or left blank to mean finished) with start/finish dates
- Free-text notes per entry
- Shared tags across all media types, plus per-type genre
- Cover art, either picked from a local file or fetched from a URL
- Autofill from an external database by title — currently live for Books (Open Library) and Music (MusicBrainz); Movies/TV (TMDB) and Games (RAWG) are wired up in the architecture but waiting on API keys
- Combined "All" view spanning every media type at once, alongside the five per-type views
- Filter by status, rating range, genre, tags, year, and date range; full-text search by title/notes; sort by multiple fields
- Save a filter combination as a named preset and reload it later, from any library view
- Right-click an entry card for quick Edit/Delete without opening it first
- Stats dashboard — entries by type/status, rating distribution, top genres, entries finished per year, and per-type totals (hours played, pages read, etc.)
- Export your whole library to a JSON file and import it back in (additive — never overwrites existing data)
- Local-only storage — your data stays on your machine (SQLite)

## Tech stack

- [Electron](https://www.electronjs.org/) desktop shell
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) for the UI
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- TypeScript throughout, with a typed IPC contract between the renderer and main process
- [Open Library](https://openlibrary.org/dev/docs/api/search) and [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) for external metadata autofill
- [Recharts](https://recharts.org/) for the stats dashboard's charts

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

Actively developed. Core tracking, rating, notes, filtering, full-text search, the combined "All" view, cover art, external-database autofill (for two of five media types so far), right-click quick actions, backup/restore, saved filter presets, and a stats dashboard are all in place. Not yet built: TMDB/RAWG autofill (needs API keys) and cloud sync.

See [CLAUDE.md](./CLAUDE.md) for architecture notes if you're contributing or exploring the code.
