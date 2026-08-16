import { getDb } from '../connection';
import type { Tag } from '@shared/types';

export const tagRepo = {
  list(): Tag[] {
    return getDb().prepare('SELECT id, name FROM tags ORDER BY name COLLATE NOCASE').all() as Tag[];
  },

  create(name: string): Tag {
    const db = getDb();
    const existing = db.prepare('SELECT id, name FROM tags WHERE name = ? COLLATE NOCASE').get(name) as Tag | undefined;
    if (existing) return existing;

    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    return { id: result.lastInsertRowid as number, name };
  },

  delete(id: number): void {
    // ON DELETE CASCADE on each junction table removes any links to this tag.
    getDb().prepare('DELETE FROM tags WHERE id = ?').run(id);
  },

  rename(id: number, name: string): Tag {
    // `tags.name` is UNIQUE COLLATE NOCASE (see migrations/0001_init.sql) - renaming to a name
    // that collides case-insensitively with a *different* existing tag throws here, letting the
    // constraint violation propagate as a normal error rather than needing a defensive pre-check.
    getDb().prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id);
    return { id, name };
  },
};
