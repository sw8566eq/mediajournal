import type { MediaType, Tag } from '@shared/types';
import { STATUS_LABELS, TYPE_FIELDS } from '../../mediaTypeConfig';
import { coverUrl } from '../../coverUrl';

interface Props {
  mediaType: MediaType;
  entry: Record<string, unknown>;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function EntryDetail({ mediaType, entry, onEdit, onDelete, onBack }: Props) {
  const rating = entry.ratingTenths as number | null;
  const tags = (entry.tags as Tag[] | undefined) ?? [];
  const cover = coverUrl(entry.coverPath as string | null | undefined);

  return (
    <div className="entry-detail">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back
      </button>
      <h2>{entry.title as string}</h2>

      {cover && (
        <div className="entry-detail-cover">
          <img src={cover} alt="" />
        </div>
      )}

      <div className="meta-grid">
        {TYPE_FIELDS[mediaType].map((f) => (
          <div key={f.key}>
            <strong>{f.label}:</strong> {entry[f.key] === null || entry[f.key] === undefined ? '—' : String(entry[f.key])}
          </div>
        ))}
        <div>
          <strong>Genre:</strong> {(entry.genre as string) || '—'}
        </div>
        <div>
          <strong>Rating:</strong> {rating === null ? '—' : `${(rating / 10).toFixed(1)}/10`}
        </div>
        <div>
          <strong>Status:</strong> {STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS]}
        </div>
        <div>
          <strong>Start:</strong> {(entry.startDate as string) || '—'}
        </div>
        <div>
          <strong>Finish:</strong> {(entry.finishDate as string) || '—'}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="tag-list">
          {tags.map((t) => (
            <span className="tag-chip" key={t.id}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="notes-block">
        <h3>Notes</h3>
        <p>{(entry.notes as string) || 'No notes yet.'}</p>
      </div>

      <div className="form-actions">
        <button type="button" className="primary" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
