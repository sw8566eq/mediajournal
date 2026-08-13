-- Replaces the explicit 'none' status value with a genuinely blank (NULL) status. Only 'planned'
-- and 'in_progress' are real status values now; NULL means "no active status" (implicitly
-- finished) and the UI simply omits the status display rather than showing a "None" label.
--
-- Same table-rebuild approach as 0002 (SQLite can't ALTER a CHECK constraint in place), remapping
-- existing 'none' rows to NULL and leaving 'planned'/'in_progress' rows as-is. migrate.ts toggles
-- foreign_keys off around every migration's transaction, so this rebuild doesn't cascade-delete
-- rows in the *_tags junction tables the way it would with foreign_keys left on.

-- movies
CREATE TABLE movies_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  director      TEXT,
  year          INTEGER,
  runtime_min   INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT CHECK (status IS NULL OR status IN ('planned','in_progress')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO movies_new SELECT
  id, title, director, year, runtime_min, genre, rating_tenths,
  CASE WHEN status = 'none' THEN NULL ELSE status END,
  start_date, finish_date, notes, external_id, cover_path, created_at, updated_at
FROM movies;
DROP TABLE movies;
ALTER TABLE movies_new RENAME TO movies;
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_rating ON movies(rating_tenths);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_genre ON movies(genre);

-- tv_shows
CREATE TABLE tv_shows_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  creator         TEXT,
  year            INTEGER,
  seasons_watched INTEGER,
  genre           TEXT,
  rating_tenths   INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status          TEXT CHECK (status IS NULL OR status IN ('planned','in_progress')),
  start_date      TEXT,
  finish_date     TEXT,
  notes           TEXT,
  external_id     TEXT,
  cover_path      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tv_shows_new SELECT
  id, title, creator, year, seasons_watched, genre, rating_tenths,
  CASE WHEN status = 'none' THEN NULL ELSE status END,
  start_date, finish_date, notes, external_id, cover_path, created_at, updated_at
FROM tv_shows;
DROP TABLE tv_shows;
ALTER TABLE tv_shows_new RENAME TO tv_shows;
CREATE INDEX idx_tv_shows_status ON tv_shows(status);
CREATE INDEX idx_tv_shows_rating ON tv_shows(rating_tenths);
CREATE INDEX idx_tv_shows_year ON tv_shows(year);
CREATE INDEX idx_tv_shows_genre ON tv_shows(genre);

-- books
CREATE TABLE books_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  author        TEXT,
  year          INTEGER,
  pages         INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT CHECK (status IS NULL OR status IN ('planned','in_progress')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO books_new SELECT
  id, title, author, year, pages, genre, rating_tenths,
  CASE WHEN status = 'none' THEN NULL ELSE status END,
  start_date, finish_date, notes, external_id, cover_path, created_at, updated_at
FROM books;
DROP TABLE books;
ALTER TABLE books_new RENAME TO books;
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_rating ON books(rating_tenths);
CREATE INDEX idx_books_year ON books(year);
CREATE INDEX idx_books_genre ON books(genre);

-- albums
CREATE TABLE albums_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  artist        TEXT,
  year          INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT CHECK (status IS NULL OR status IN ('planned','in_progress')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO albums_new SELECT
  id, title, artist, year, genre, rating_tenths,
  CASE WHEN status = 'none' THEN NULL ELSE status END,
  start_date, finish_date, notes, external_id, cover_path, created_at, updated_at
FROM albums;
DROP TABLE albums;
ALTER TABLE albums_new RENAME TO albums;
CREATE INDEX idx_albums_status ON albums(status);
CREATE INDEX idx_albums_rating ON albums(rating_tenths);
CREATE INDEX idx_albums_year ON albums(year);
CREATE INDEX idx_albums_genre ON albums(genre);

-- games
CREATE TABLE games_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  developer     TEXT,
  platform      TEXT,
  year          INTEGER,
  hours_played  REAL,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT CHECK (status IS NULL OR status IN ('planned','in_progress')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO games_new SELECT
  id, title, developer, platform, year, hours_played, genre, rating_tenths,
  CASE WHEN status = 'none' THEN NULL ELSE status END,
  start_date, finish_date, notes, external_id, cover_path, created_at, updated_at
FROM games;
DROP TABLE games;
ALTER TABLE games_new RENAME TO games;
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_rating ON games(rating_tenths);
CREATE INDEX idx_games_year ON games(year);
CREATE INDEX idx_games_genre ON games(genre);
