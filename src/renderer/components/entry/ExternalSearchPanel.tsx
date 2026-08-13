import { useState, type FormEvent } from 'react';
import type { ExternalSearchResult, MediaType } from '@shared/types';
import { EXTERNAL_PROVIDER_LABELS } from '../../mediaTypeConfig';
import { api } from '../../api/client';

interface Props {
  mediaType: MediaType;
  initialQuery: string;
  onApplyResult: (result: ExternalSearchResult) => void;
}

/** Search an external media database and autofill the form from a picked result. */
export function ExternalSearchPanel({ mediaType, initialQuery, onApplyResult }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ExternalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const response = await api.externalSearch.search(mediaType, query.trim());
      if (response.status === 'ok') {
        setResults(response.results);
      } else if (response.status === 'not_configured') {
        setNotConfigured(true);
        setResults([]);
      } else {
        setError(response.message);
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleApply(result: ExternalSearchResult) {
    onApplyResult(result);
    setResults([]);
  }

  return (
    <div className="external-search">
      <form className="external-search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder={`Search ${EXTERNAL_PROVIDER_LABELS[mediaType]}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {notConfigured && (
        <div className="hint">
          Search for this media type isn't set up yet (needs an {EXTERNAL_PROVIDER_LABELS[mediaType]} API key) —
          coming soon.
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {results.length > 0 && (
        <div className="external-search-results">
          {results.map((result) => (
            <button
              type="button"
              key={result.externalId}
              className="external-search-result"
              onClick={() => handleApply(result)}
            >
              {result.coverImageUrl ? (
                <img src={result.coverImageUrl} alt="" />
              ) : (
                <div className="external-search-result-cover-placeholder" />
              )}
              <div className="external-search-result-text">
                <div className="external-search-result-title">{result.title}</div>
                <div className="external-search-result-subtitle">
                  {[result.subtitle, result.year].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
