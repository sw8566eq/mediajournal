-- Removes start_date/finish_date from every media table - not something worth tracking going
-- forward. `created_at` (always present, auto-populated on insert) is the source of truth for
-- "when was this logged" now; free-text start/finish notes can go in `notes` if wanted.
--
-- Plain ALTER TABLE DROP COLUMN per table, not the CREATE-_new/INSERT/DROP/RENAME rebuild dance
-- used for CHECK-constraint changes (see 0002/0003): neither column is referenced by an index
-- (see 0001-0003 - only status/rating_tenths/year/genre are indexed) or a CHECK constraint, and
-- better-sqlite3's bundled SQLite is well past the 3.35.0 version that added native DROP COLUMN
-- support. Unlike a rebuild, this doesn't touch the table's rowid or drop its triggers, so the
-- <table>_fts sync triggers (title/notes only - unrelated to either dropped column) are untouched
-- and need no recreation here.
ALTER TABLE movies DROP COLUMN start_date;
ALTER TABLE movies DROP COLUMN finish_date;

ALTER TABLE tv_shows DROP COLUMN start_date;
ALTER TABLE tv_shows DROP COLUMN finish_date;

ALTER TABLE books DROP COLUMN start_date;
ALTER TABLE books DROP COLUMN finish_date;

ALTER TABLE albums DROP COLUMN start_date;
ALTER TABLE albums DROP COLUMN finish_date;

ALTER TABLE games DROP COLUMN start_date;
ALTER TABLE games DROP COLUMN finish_date;
