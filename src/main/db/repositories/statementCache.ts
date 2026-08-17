// Pure cache-invalidation logic for `createMediaRepository`'s prepared-statement cache - split out
// of mediaRepository.ts into its own zero-Electron-dependency file for the same reason as
// queryBuilder.ts/tagGrouping.ts (see their header comments): mediaRepository.ts transitively
// imports `../connection`, which crashes under plain `vitest run` (host Node) since better-sqlite3
// is built against Electron's Node ABI. Keeping this file free of that import, and free of any
// direct reference to better-sqlite3's types, is what makes it testable at all - the identity-based
// reset logic below doesn't actually care what kind of object the "key" is.

/**
 * A slot holding one value, valid only for the most recent key it was asked about - reset (to a
 * fresh empty object) whenever the key changes, rather than growing unboundedly keyed by every key
 * ever seen. Used by mediaRepository.ts to cache prepared statements per repository, keyed by
 * which Database connection they were prepared against: `getDb()` is normally a stable singleton
 * for the app's whole lifetime, but transparently opens a *new* connection after `closeDb()` (e.g.
 * on macOS, closing every window without quitting, then reactivating - see CLAUDE.md's Database
 * section and main.ts), which would otherwise leave a cached statement pointing at a closed
 * connection. Comparing keys by reference (`===`), not deep equality, is deliberate - two different
 * Database connections are never "the same" just because they happen to look alike.
 */
export function createKeyedSlot<K, V extends object>(): { forKey: (key: K) => Partial<V> } {
  let cachedKey: K | undefined;
  let cachedValue: Partial<V> = {};

  return {
    forKey(key: K): Partial<V> {
      if (key !== cachedKey) {
        cachedKey = key;
        cachedValue = {};
      }
      return cachedValue;
    },
  };
}
