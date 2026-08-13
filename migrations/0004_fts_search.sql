-- Upgrades title/notes search from a plain LIKE scan to SQLite FTS5, per media type table,
-- matching the project's existing "one table per type" philosophy rather than one combined
-- index. Each FTS5 table is an "external content" index over its source table (title, notes) -
-- it stores only the search index, not a duplicate copy of the data, kept in sync via triggers.
--
-- Gotcha for future migrations: dropping a table automatically drops any triggers defined on it.
-- If a future migration ever rebuils one of these 5 tables (e.g. another CHECK constraint change,
-- following the pattern in 0002/0003), it must recreate that table's three _fts_ai/_au/_ad
-- triggers too, or search silently stops staying in sync with new/edited/deleted rows. The
-- `<table>_fts` virtual table itself does not need to be dropped/recreated in that case - it
-- references rows by rowid, which survives a rebuild as long as ids are preserved (as the
-- existing rebuild pattern already does).

-- movies
CREATE VIRTUAL TABLE movies_fts USING fts5(title, notes, content='movies', content_rowid='id');
INSERT INTO movies_fts(rowid, title, notes) SELECT id, title, notes FROM movies;

CREATE TRIGGER movies_fts_ai AFTER INSERT ON movies BEGIN
  INSERT INTO movies_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER movies_fts_ad AFTER DELETE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER movies_fts_au AFTER UPDATE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO movies_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;

-- tv_shows
CREATE VIRTUAL TABLE tv_shows_fts USING fts5(title, notes, content='tv_shows', content_rowid='id');
INSERT INTO tv_shows_fts(rowid, title, notes) SELECT id, title, notes FROM tv_shows;

CREATE TRIGGER tv_shows_fts_ai AFTER INSERT ON tv_shows BEGIN
  INSERT INTO tv_shows_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER tv_shows_fts_ad AFTER DELETE ON tv_shows BEGIN
  INSERT INTO tv_shows_fts(tv_shows_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER tv_shows_fts_au AFTER UPDATE ON tv_shows BEGIN
  INSERT INTO tv_shows_fts(tv_shows_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO tv_shows_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;

-- books
CREATE VIRTUAL TABLE books_fts USING fts5(title, notes, content='books', content_rowid='id');
INSERT INTO books_fts(rowid, title, notes) SELECT id, title, notes FROM books;

CREATE TRIGGER books_fts_ai AFTER INSERT ON books BEGIN
  INSERT INTO books_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER books_fts_ad AFTER DELETE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER books_fts_au AFTER UPDATE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO books_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;

-- albums
CREATE VIRTUAL TABLE albums_fts USING fts5(title, notes, content='albums', content_rowid='id');
INSERT INTO albums_fts(rowid, title, notes) SELECT id, title, notes FROM albums;

CREATE TRIGGER albums_fts_ai AFTER INSERT ON albums BEGIN
  INSERT INTO albums_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER albums_fts_ad AFTER DELETE ON albums BEGIN
  INSERT INTO albums_fts(albums_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER albums_fts_au AFTER UPDATE ON albums BEGIN
  INSERT INTO albums_fts(albums_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO albums_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;

-- games
CREATE VIRTUAL TABLE games_fts USING fts5(title, notes, content='games', content_rowid='id');
INSERT INTO games_fts(rowid, title, notes) SELECT id, title, notes FROM games;

CREATE TRIGGER games_fts_ai AFTER INSERT ON games BEGIN
  INSERT INTO games_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER games_fts_ad AFTER DELETE ON games BEGIN
  INSERT INTO games_fts(games_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER games_fts_au AFTER UPDATE ON games BEGIN
  INSERT INTO games_fts(games_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO games_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
