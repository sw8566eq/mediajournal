import type { MediaType, Tag } from '@shared/types';
import { MEDIA_TYPE_LABELS, PRIMARY_FIELD, STATUS_LABELS } from '../../mediaTypeConfig';
import { coverUrl } from '../../coverUrl';

interface Props {
  mediaType: MediaType;
  entry: Record<string, unknown>;
  onClick: () => void;
  /** Shows a small media-type pill (e.g. "Books") - used in the combined "All" view where cards mix types. */
  showTypeBadge?: boolean;
}

export function EntryCard({ mediaType, entry, onClick, showTypeBadge }: Props) {
  const rating = entry.ratingTenths as number | null;
  const primaryValue = entry[PRIMARY_FIELD[mediaType]] as string | null;
  const tags = (entry.tags as Tag[] | undefined) ?? [];
  const status = entry.status as keyof typeof STATUS_LABELS | null;
  const cover = coverUrl(entry.coverPath as string | null | undefined);

  return (
    <div className={cover ? 'entry-card has-cover' : 'entry-card'} onClick={onClick} role="button" tabIndex={0}>
      {cover && (
        <div className="entry-card-cover">
          <img src={cover} alt="" />
        </div>
      )}
      <div className="entry-card-title">{entry.title as string}</div>
      <div className="entry-card-subtitle">{[primaryValue, entry.year].filter(Boolean).join(' · ') || '—'}</div>
      <div className="entry-card-meta">
        {showTypeBadge && <span className="pill type-badge">{MEDIA_TYPE_LABELS[mediaType]}</span>}
        {entry.genre ? <span className="pill">{entry.genre as string}</span> : null}
        {status && <span className={`pill status-${status}`}>{STATUS_LABELS[status]}</span>}
        {rating !== null && <span className="pill rating">{(rating / 10).toFixed(1)}/10</span>}
      </div>
      {tags.length > 0 && (
        <div className="tag-list small">
          {tags.map((t) => (
            <span className="tag-chip" key={t.id}>
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
