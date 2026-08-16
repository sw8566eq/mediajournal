import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EntryStatus, ExternalSearchResult, MediaType, Tag } from '@shared/types';
import { api } from '../../api/client';
import { PRIMARY_FIELD } from '../../mediaTypeConfig';
import { RatingInput } from './RatingInput';
import { StatusSelect } from './StatusSelect';
import { TagPicker } from './TagPicker';
import { TypeSpecificFields } from './TypeSpecificFields';
import { CoverArtField } from './CoverArtField';
import { ExternalSearchPanel } from './ExternalSearchPanel';
import { MoreFieldsSection } from './MoreFieldsSection';

export interface EntryFormValues {
  title: string;
  genre: string | null;
  ratingTenths: number | null;
  status: EntryStatus | null;
  startDate: string | null;
  finishDate: string | null;
  notes: string | null;
  externalId: string | null;
  coverPath: string | null;
  tagIds: number[];
  [key: string]: unknown; // type-specific fields (director, year, pages, ...)
}

interface Props {
  mediaType: MediaType;
  initialValues?: Partial<EntryFormValues>;
  allTags: Tag[];
  onCreateTag: (name: string) => Promise<Tag>;
  onSubmit: (values: EntryFormValues) => Promise<void>;
  onCancel: () => void;
}

const DEFAULTS: EntryFormValues = {
  title: '',
  genre: null,
  ratingTenths: null,
  status: null,
  startDate: null,
  finishDate: null,
  notes: null,
  externalId: null,
  coverPath: null,
  tagIds: [],
};

/** Shared create/edit form shell: common fields + the type-specific fields slotted in for the active media type. */
export function EntryForm({ mediaType, initialValues, allTags, onCreateTag, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<EntryFormValues>({ ...DEFAULTS, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True while a cover art pick/URL-fetch/external-search-apply is in flight, so Save can't be
  // clicked before the resulting coverPath is actually applied to `values` (it used to be possible
  // to save with the previous cover if you clicked Save right after picking a new one).
  const [coverBusy, setCoverBusy] = useState(false);

  // Cover art cleanup bookkeeping: the cover this entry had when the form opened, and every file
  // imported (picked/downloaded) during this session, so we can delete whichever ones don't end
  // up persisted rather than leaving orphaned files on disk. See handleSubmit/handleCancel below.
  const originalCoverPath = useRef(initialValues?.coverPath ?? null).current;
  const sessionImportedFiles = useRef<string[]>([]);

  // handleSubmit's onSubmit(values) call changes the parent's view, unmounting this component
  // before the cleanup/finally code below finishes - guard against updating state after that.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function set<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (coverBusy) return; // defensive: the Save button is disabled while true, but guard direct submits too
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      const finalCoverPath = values.coverPath;
      const stale = sessionImportedFiles.current.filter((f) => f !== finalCoverPath);
      if (originalCoverPath && originalCoverPath !== finalCoverPath) stale.push(originalCoverPath);
      await Promise.all(stale.map((f) => api.covers.remove(f)));
    } catch (err) {
      if (isMountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }

  function handleCancel() {
    // Nothing was saved, so every file imported this session (including the currently-selected one) is orphaned.
    void Promise.all(sessionImportedFiles.current.map((f) => api.covers.remove(f)));
    onCancel();
  }

  // Only touches the fields autofill is actually responsible for - notes/tags/rating/status/
  // dates are left alone, since those are the user's own content, not metadata lookup results.
  async function handleApplyExternalResult(result: ExternalSearchResult) {
    const primaryKey = PRIMARY_FIELD[mediaType];
    setValues((prev) => ({
      ...prev,
      title: result.title,
      year: result.year,
      genre: result.genre ?? prev.genre,
      [primaryKey]: result.subtitle,
      externalId: result.externalId,
    }));

    if (result.coverImageUrl) {
      setCoverBusy(true);
      try {
        const filename = await api.covers.importFromUrl(result.coverImageUrl);
        sessionImportedFiles.current.push(filename);
        set('coverPath', filename);
      } catch {
        // Best-effort - not every result has cover art available. Metadata autofill still applies.
      } finally {
        setCoverBusy(false);
      }
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-form-main">
        <h2>{initialValues ? 'Edit Entry' : 'Add Entry'}</h2>
        {error && <div className="error-banner">{error}</div>}

        <ExternalSearchPanel mediaType={mediaType} initialQuery={values.title} onApplyResult={handleApplyExternalResult} />

        <label className="field">
          <span>Title</span>
          <input type="text" required value={values.title} onChange={(e) => set('title', e.target.value)} />
        </label>

        <TypeSpecificFields
          mediaType={mediaType}
          values={values}
          variant="primary"
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />

        <RatingInput valueTenths={values.ratingTenths} onChange={(v) => set('ratingTenths', v)} />

        <label className="field">
          <span>Notes</span>
          <textarea rows={5} value={values.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
        </label>

        <TagPicker allTags={allTags} selectedIds={values.tagIds} onChange={(ids) => set('tagIds', ids)} onCreateTag={onCreateTag} />

        <MoreFieldsSection>
          <TypeSpecificFields
            mediaType={mediaType}
            values={values}
            variant="secondary"
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />

          <label className="field">
            <span>Genre</span>
            <input type="text" value={values.genre ?? ''} onChange={(e) => set('genre', e.target.value || null)} />
          </label>

          <StatusSelect
            value={values.status}
            onChange={(v) => {
              set('status', v);
              // Neither date makes sense for something merely planned (not started yet), and
              // in-progress means not finished yet - drop whichever date(s) no longer apply
              // rather than leaving a stale one hidden (and still saved) once the field(s) below
              // disappear.
              if (v === 'planned') {
                if (values.startDate) set('startDate', null);
                if (values.finishDate) set('finishDate', null);
              } else if (v === 'in_progress' && values.finishDate) {
                set('finishDate', null);
              }
            }}
          />

          {values.status !== 'planned' && (
            <label className="field">
              <span>Start Date</span>
              <input
                type="date"
                value={values.startDate ?? ''}
                onChange={(e) => set('startDate', e.target.value || null)}
              />
            </label>
          )}
          {values.status !== 'in_progress' && values.status !== 'planned' && (
            <label className="field">
              <span>Finish Date</span>
              <input
                type="date"
                value={values.finishDate ?? ''}
                onChange={(e) => set('finishDate', e.target.value || null)}
              />
            </label>
          )}
        </MoreFieldsSection>

        <div className="form-actions">
          <button type="button" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving || coverBusy} title={coverBusy ? 'Waiting for cover art to finish…' : undefined}>
            {saving ? 'Saving…' : coverBusy ? 'Fetching cover…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="entry-form-side">
        <CoverArtField
          value={values.coverPath}
          onChange={(filename) => set('coverPath', filename)}
          onImported={(filename) => sessionImportedFiles.current.push(filename)}
          onBusyChange={setCoverBusy}
        />
      </div>
    </form>
  );
}
