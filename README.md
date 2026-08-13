# Media Journal

A personal desktop app for tracking movies, TV shows, books, music, and games you've watched, read, listened to, or played — with ratings, status, notes, and tags.

## Features

- Separate library views for Movies, TV, Books, Music, and Games
- 10-point rating scale (e.g. `8.2/10`)
- Status tracking (Planned / In Progress / Completed / Dropped) with start/finish dates
- Free-text notes per entry
- Shared tags across all media types, plus per-type genre
- Filter by status, rating range, genre, tags, year, and date range; search by title/notes; sort by multiple fields
- Local-only storage — your data stays on your machine (SQLite)

## Tech stack

- [Electron](https://www.electronjs.org/) desktop shell
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) for the UI
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- TypeScript throughout, with a typed IPC contract between the renderer and main process

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

## Project status

This is an early, actively developed v1: core tracking, rating, notes, and filtering across all five media types are in place. Not yet built: searching external databases to autofill metadata, cover art, cloud sync, and stats/charts.

See [CLAUDE.md](./CLAUDE.md) for architecture notes if you're contributing or exploring the code.
