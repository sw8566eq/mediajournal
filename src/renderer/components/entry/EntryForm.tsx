import { useState, type FormEvent } from 'react';
import type { EntryStatus, MediaType, Tag } from '@shared/types';
import { RatingInput } from './RatingInput';
import { StatusSelect } from './StatusSelect';
import { TagPicker } from './TagPicker';
import { TypeSpecificFields } from './TypeSpecificFields';

export interface EntryFormValues {
  title: string;
  genre: string | null;
  ratingTenths: number | null;
  status: EntryStatus;
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
  status: 'planned',
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

  function set<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h2>{initialValues ? 'Edit Entry' : 'Add Entry'}</h2>
      {error && <div className="error-banner">{error}</div>}

      <label className="field">
        <span>Title</span>
        <input type="text" required value={values.title} onChange={(e) => set('title', e.target.value)} />
      </label>

      <TypeSpecificFields
        mediaType={mediaType}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
      />

      <label className="field">
        <span>Genre</span>
        <input type="text" value={values.genre ?? ''} onChange={(e) => set('genre', e.target.value || null)} />
      </label>

      <RatingInput valueTenths={values.ratingTenths} onChange={(v) => set('ratingTenths', v)} />
      <StatusSelect value={values.status} onChange={(v) => set('status', v)} />

      <label className="field">
        <span>Start Date</span>
        <input type="date" value={values.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} />
      </label>
      <label className="field">
        <span>Finish Date</span>
        <input type="date" value={values.finishDate ?? ''} onChange={(e) => set('finishDate', e.target.value || null)} />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea rows={5} value={values.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
      </label>

      <TagPicker allTags={allTags} selectedIds={values.tagIds} onChange={(ids) => set('tagIds', ids)} onCreateTag={onCreateTag} />

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
