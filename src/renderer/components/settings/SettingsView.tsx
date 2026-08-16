import { useState } from 'react';
import { api } from '../../api/client';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';

interface Props {
  /** Called after a successful import so the caller can refresh anything cached from before (e.g. the shared tag list). */
  onImported: () => void;
}

export function SettingsView({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const filePath = await api.backup.exportLibrary();
      if (filePath) setMessage(`Exported to ${filePath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const summary = await api.backup.importLibrary();
      if (summary) {
        const parts = MEDIA_TYPE_ORDER.filter((type) => summary[type] > 0).map(
          (type) => `${summary[type]} ${MEDIA_TYPE_LABELS[type]}`,
        );
        const tagsPart = summary.tags > 0 ? `${summary.tags} tag${summary.tags === 1 ? '' : 's'}` : null;
        const allParts = [...parts, tagsPart].filter(Boolean);
        setMessage(allParts.length ? `Imported ${allParts.join(', ')}.` : 'Nothing to import - the file was empty.');
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Data</h3>
        <p className="hint">
          Export your library to a JSON file, or import a previously-exported file. Importing always adds new
          entries - it never deletes or overwrites what&apos;s already here. Cover art isn&apos;t included in exports, only
          your entries, ratings, notes, and tags.
        </p>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        <div className="settings-actions">
          <button type="button" onClick={handleExport} disabled={busy}>
            Export Library
          </button>
          <button type="button" onClick={handleImport} disabled={busy}>
            Import Library
          </button>
        </div>
      </section>
    </div>
  );
}
