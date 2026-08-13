import { useState } from 'react';
import { api } from '../../api/client';
import { coverUrl } from '../../coverUrl';

interface Props {
  value: string | null;
  onChange: (filename: string | null) => void;
  /** Called whenever a new file gets imported (picked or downloaded), so the form can track it for cleanup. */
  onImported: (filename: string) => void;
}

/** Lets the user set cover art either from a local file (native picker, via the main process) or an image URL. */
export function CoverArtField({ value, onChange, onImported }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickFromDisk() {
    setError(null);
    setBusy(true);
    try {
      const filename = await api.covers.pickFromDisk();
      if (filename) {
        onImported(filename);
        onChange(filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFromUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setError(null);
    setBusy(true);
    try {
      const filename = await api.covers.importFromUrl(url);
      onImported(filename);
      onChange(filename);
      setUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field cover-art-field">
      <span>Cover Art</span>

      {value ? (
        <div className="cover-preview">
          <img src={coverUrl(value)!} alt="Cover art preview" />
          <button type="button" onClick={() => onChange(null)} disabled={busy}>
            Remove
          </button>
        </div>
      ) : (
        <div className="cover-preview empty">No cover selected</div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="cover-art-actions">
        <button type="button" onClick={handlePickFromDisk} disabled={busy}>
          {busy ? 'Working…' : 'Choose from computer'}
        </button>
        <div className="cover-url-row">
          <input
            type="text"
            placeholder="Paste an image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleImportFromUrl();
              }
            }}
            disabled={busy}
          />
          <button type="button" onClick={handleImportFromUrl} disabled={busy || !urlInput.trim()}>
            Fetch
          </button>
        </div>
      </div>
    </div>
  );
}
