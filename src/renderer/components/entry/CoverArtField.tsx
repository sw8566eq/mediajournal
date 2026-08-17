import { useState } from 'react';
import { api } from '../../api/client';
import { coverUrl } from '../../coverUrl';
import { toErrorMessage } from '../../errorMessage';

interface Props {
  value: string | null;
  onChange: (filename: string | null) => void;
  /** Called whenever a new file gets imported (picked or downloaded), so the form can track it for cleanup. */
  onImported: (filename: string) => void;
  /** Reports whether a pick/fetch is in flight, so the parent form can hold off on Save until it settles. */
  onBusyChange?: (busy: boolean) => void;
}

/** Lets the user set cover art either from a local file (native picker, via the main process) or an image URL. */
export function CoverArtField({ value, onChange, onImported, onBusyChange }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBusyState(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  async function handlePickFromDisk() {
    setError(null);
    setBusyState(true);
    try {
      const filename = await api.covers.pickFromDisk();
      if (filename) {
        onImported(filename);
        onChange(filename);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusyState(false);
    }
  }

  async function handleImportFromUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setError(null);
    setBusyState(true);
    try {
      const filename = await api.covers.importFromUrl(url);
      onImported(filename);
      onChange(filename);
      setUrlInput('');
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusyState(false);
    }
  }

  return (
    <div className="field cover-art-field">
      <span>Cover Art</span>

      {value ? (
        <div className="cover-preview">
          {/* Wrapper carves out "remaining space after the Remove button" as the image's own
              clean containing block, so its max-width/max-height (below) resolve against that,
              not the whole column (which also has to leave room for the button). */}
          <div className="cover-preview-image">
            <img src={coverUrl(value)!} alt="Cover art preview" />
          </div>
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
