import { useEffect, useState } from 'react';
import type { GenreCount } from '@shared/types';
import { api } from '../../api/client';
import { TextPromptDialog } from '../common/TextPromptDialog';

/** Single consumer of the genre list (unlike tags, which many components share via an App-level
 *  useTags() hook) - fetches directly here rather than adding App-level state/prop-threading for
 *  something only Settings needs. LibraryView/AllLibraryView deliberately keep deriving their own
 *  filter-dropdown genre options from currently-loaded entries, unchanged - this is a separate,
 *  library-wide view for the housekeeping action (rename/merge) those views have no room for. */
export function GenreManager() {
  const [genres, setGenres] = useState<GenreCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRename, setPendingRename] = useState<{ name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    setGenres(await api.genres.list());
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  async function submitRename(newName: string) {
    if (!pendingRename) return;
    try {
      const { updated } = await api.genres.rename(pendingRename.name, newName);
      setMessage(`Renamed "${pendingRename.name}" to "${newName}" - ${updated} ${updated === 1 ? 'entry' : 'entries'} updated.`);
      setError(null);
      setPendingRename(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="settings-section">
      <h3>Genres</h3>
      <p className="hint">
        Genre is free text per entry, so typos or inconsistent casing (&quot;Sci-Fi&quot; vs &quot;SciFi&quot;) can quietly
        become separate values. Rename a genre here to merge it into another everywhere it&apos;s used.
      </p>

      {message && <div className="success-banner">{message}</div>}
      {loading && <div className="status-line">Loading…</div>}
      {!loading && genres.length === 0 && <div className="hint">No genres logged yet.</div>}

      {genres.length > 0 && (
        <ul className="genre-manage-list">
          {genres.map((g) => (
            <li key={g.name}>
              <span>
                {g.name} <span className="hint">({g.count})</span>
              </span>
              <button type="button" onClick={() => setPendingRename({ name: g.name })}>
                Rename
              </button>
            </li>
          ))}
        </ul>
      )}

      <TextPromptDialog
        open={pendingRename !== null}
        title={`Rename genre "${pendingRename?.name}"`}
        initialValue={pendingRename?.name ?? ''}
        submitLabel="Rename"
        error={error}
        onSave={submitRename}
        onCancel={() => {
          setPendingRename(null);
          setError(null);
        }}
      />
    </section>
  );
}
