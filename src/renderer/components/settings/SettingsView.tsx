import { useState } from 'react';
import type { MediaType, SourceImportSummary } from '@shared/types';
import { api } from '../../api/client';
import { toErrorMessage } from '../../errorMessage';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../theme';
import { GenreManager } from './GenreManager';
import { formatSourceImportSummary, formatImportSummary } from '../../importSummary';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  /** Called after a successful import so the caller can refresh anything cached from before (e.g. the shared tag list). */
  onImported: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsView({ onImported }: Props) {
  const { theme, setTheme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Separate from the Data section's busy/message/error/warnings above (a "check, then confirm,
  // then delete" flow doesn't fit that single-action shell) but still reuses runAction for the
  // scan/delete calls themselves.
  const [orphanedCovers, setOrphanedCovers] = useState<string[] | null>(null);
  const [confirmingCleanup, setConfirmingCleanup] = useState(false);

  // Every action below (export, import, and the two CSV imports) shares this exact reset/
  // try/catch/finally shell - factored once so each handler only states what's actually distinct
  // about it, rather than repeating the busy/error/message/warnings bookkeeping four times.
  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    setWarnings([]);
    try {
      await action();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    return runAction(async () => {
      const filePath = await api.backup.exportLibrary();
      if (filePath) setMessage(`Exported to ${filePath}`);
    });
  }

  function handleImport() {
    return runAction(async () => {
      const summary = await api.backup.importLibrary();
      if (summary) {
        setMessage(formatImportSummary(summary));
        onImported();
      }
    });
  }

  function handleExportFull() {
    return runAction(async () => {
      const filePath = await api.backup.exportFullBackup();
      if (filePath) setMessage(`Exported to ${filePath}`);
    });
  }

  function handleImportFull() {
    return runAction(async () => {
      const summary = await api.backup.importFullBackup();
      if (summary) {
        setMessage(formatImportSummary(summary));
        onImported();
      }
    });
  }

  // Two-step: scan first (no confirmation needed, nothing's deleted yet), then confirm before
  // actually removing anything - deleting files is not undoable, unlike every other action in this
  // section.
  function handleCheckOrphanedCovers() {
    return runAction(async () => {
      const files = await api.covers.findOrphaned();
      if (files.length === 0) {
        setMessage('No unused cover images found.');
      } else {
        setOrphanedCovers(files);
        setConfirmingCleanup(true);
      }
    });
  }

  function confirmCleanupOrphanedCovers() {
    setConfirmingCleanup(false);
    return runAction(async () => {
      const { deleted } = await api.covers.cleanupOrphaned();
      setMessage(`Deleted ${deleted} unused cover image${deleted === 1 ? '' : 's'}.`);
      setOrphanedCovers(null);
    });
  }

  // The Goodreads/Letterboxd handlers are additionally identical to *each other* beyond runAction's
  // shell - both just call one api.import.* method and, on a non-null summary, format+show it the
  // same way - so this factors that shared body too, leaving each handler a one-line caller naming
  // only what's actually different: which import to run and which media type it produced.
  function handleSourceImport(run: () => Promise<SourceImportSummary | null>, mediaType: MediaType) {
    return runAction(async () => {
      const summary = await run();
      if (summary) {
        setMessage(formatSourceImportSummary(summary, mediaType));
        setWarnings(summary.warnings);
        onImported();
      }
    });
  }

  const handleImportGoodreads = () => handleSourceImport(api.import.importGoodreads, 'book');
  const handleImportLetterboxd = () => handleSourceImport(api.import.importLetterboxd, 'movie');

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Appearance</h3>
        <p className="hint">Choose how Media Journal looks, or follow your system setting.</p>
        <div className="filter-group">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={theme === opt.value ? 'chip active' : 'chip'}
              onClick={() => setTheme(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Data</h3>
        <p className="hint">
          Export your library to a JSON file, or import a previously-exported file. Importing always adds new
          entries - it never deletes or overwrites what&apos;s already here. The plain export is metadata only
          (entries, ratings, notes, and tags); &quot;Full Backup&quot; also bundles your actual cover art images, as a
          single, larger .zip file.
        </p>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}
        {warnings.length > 0 && (
          <details className="import-warnings">
            <summary>
              {warnings.length} warning{warnings.length === 1 ? '' : 's'}
            </summary>
            <ul>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="settings-actions">
          <button type="button" onClick={handleExport} disabled={busy}>
            Export Library
          </button>
          <button type="button" onClick={handleImport} disabled={busy}>
            Import Library
          </button>
          <button type="button" onClick={handleExportFull} disabled={busy}>
            Export Full Backup (.zip)
          </button>
          <button type="button" onClick={handleImportFull} disabled={busy}>
            Import Full Backup (.zip)
          </button>
        </div>

        <h4>Import from other trackers</h4>
        <p className="hint">
          Bring in your existing history from Goodreads or Letterboxd. Each row becomes a new entry - items
          already in your library (matched by title and year) are skipped automatically, and any read/watched
          date from the source file is kept as a note. Letterboxd: export your data, unzip it, and pick
          ratings.csv or diary.csv - watchlist.csv and watched.csv aren&apos;t supported.
        </p>
        <div className="settings-actions">
          <button type="button" onClick={handleImportGoodreads} disabled={busy}>
            Import from Goodreads
          </button>
          <button type="button" onClick={handleImportLetterboxd} disabled={busy}>
            Import from Letterboxd
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Maintenance</h3>
        <p className="hint">
          Cover art files are normally cleaned up automatically when an entry is deleted or its cover is replaced.
          If one was ever left behind - e.g. by a crash mid-save - this finds and removes any cover image no
          longer used by an entry.
        </p>
        <div className="settings-actions">
          <button type="button" onClick={handleCheckOrphanedCovers} disabled={busy}>
            Clean Up Unused Cover Images
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmingCleanup}
        message={`Delete ${orphanedCovers?.length ?? 0} unused cover image${orphanedCovers?.length === 1 ? '' : 's'}? This cannot be undone.`}
        onConfirm={confirmCleanupOrphanedCovers}
        onCancel={() => {
          setConfirmingCleanup(false);
          setOrphanedCovers(null);
        }}
      />

      <GenreManager />
    </div>
  );
}
