-- Initial schema: one table per media type, a shared global tag system,
-- and a per-type junction table for tags (see plan doc for rationale).

CREATE TABLE movies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  director      TEXT,
  year          INTEGER,
  runtime_min   INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','dropped')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tv_shows (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  creator         TEXT,
  year            INTEGER,
  seasons_watched INTEGER,
  genre           TEXT,
  rating_tenths   INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','dropped')),
  start_date      TEXT,
  finish_date     TEXT,
  notes           TEXT,
  external_id     TEXT,
  cover_path      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  author        TEXT,
  year          INTEGER,
  pages         INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','dropped')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE albums (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  artist        TEXT,
  year          INTEGER,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','dropped')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE games (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  developer     TEXT,
  platform      TEXT,
  year          INTEGER,
  hours_played  REAL,
  genre         TEXT,
  rating_tenths INTEGER CHECK (rating_tenths IS NULL OR (rating_tenths BETWEEN 0 AND 100)),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','dropped')),
  start_date    TEXT,
  finish_date   TEXT,
  notes         TEXT,
  external_id   TEXT,
  cover_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shared global tag system, usable across every media type.
CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE movie_tags (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, tag_id)
);

CREATE TABLE tv_show_tags (
  tv_show_id INTEGER NOT NULL REFERENCES tv_shows(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tv_show_id, tag_id)
);

CREATE TABLE book_tags (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

CREATE TABLE album_tags (
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, tag_id)
);

CREATE TABLE game_tags (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, tag_id)
);

-- Indexes supporting the filter/sort bar (status, rating range, year, genre).
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_rating ON movies(rating_tenths);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_genre ON movies(genre);

CREATE INDEX idx_tv_shows_status ON tv_shows(status);
CREATE INDEX idx_tv_shows_rating ON tv_shows(rating_tenths);
CREATE INDEX idx_tv_shows_year ON tv_shows(year);
CREATE INDEX idx_tv_shows_genre ON tv_shows(genre);

CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_rating ON books(rating_tenths);
CREATE INDEX idx_books_year ON books(year);
CREATE INDEX idx_books_genre ON books(genre);

CREATE INDEX idx_albums_status ON albums(status);
CREATE INDEX idx_albums_rating ON albums(rating_tenths);
CREATE INDEX idx_albums_year ON albums(year);
CREATE INDEX idx_albums_genre ON albums(genre);

CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_rating ON games(rating_tenths);
CREATE INDEX idx_games_year ON games(year);
CREATE INDEX idx_games_genre ON games(genre);
