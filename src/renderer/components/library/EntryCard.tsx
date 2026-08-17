import type { KeyboardEvent, MouseEvent } from 'react';
import type { MediaType, Tag } from '@shared/types';
import { MEDIA_TYPE_LABELS, PRIMARY_FIELD, STATUS_LABELS } from '../../mediaTypeConfig';
import { coverUrl } from '../../coverUrl';

interface Props {
  mediaType: MediaType;
  entry: Record<string, unknown>;
  onClick: () => void;
  /** Right-click quick actions (Edit/Delete) without opening the entry first. Omit to disable. */
  onContextMenu?: (e: MouseEvent) => void;
  /** Shows a small media-type pill (e.g. "Books") - used in the combined "All" view where cards mix types. */
  showTypeBadge?: boolean;
  /** Bulk-selection checkbox state - persistent/always-visible rather than a separate "selection
   *  mode" toggle, so it's just always part of the card. Required (not optional) since both
   *  consumers (LibraryView/AllLibraryView) always render it - an accidentally-omitted prop would
   *  otherwise silently degrade to "nothing selectable" instead of a type error. */
  selected: boolean;
  onToggleSelect: () => void;
}

export function EntryCard({ mediaType, entry, onClick, onContextMenu, showTypeBadge, selected, onToggleSelect }: Props) {
  const rating = entry.ratingTenths as number | null;
  const primaryValue = entry[PRIMARY_FIELD[mediaType]] as string | null;
  const tags = (entry.tags as Tag[] | undefined) ?? [];
  const status = entry.status as keyof typeof STATUS_LABELS | null;
  const cover = coverUrl(entry.coverPath as string | null | undefined);

  function handleContextMenu(e: MouseEvent) {
    if (!onContextMenu) return;
    e.preventDefault();
    // Stops here rather than letting it bubble to document - ContextMenu closes itself on any
    // document-level 'contextmenu'/'mousedown', which otherwise races against this same click
    // opening/repositioning the menu (right-clicking a second card while a menu is already open
    // could close it instead of moving it, depending on listener registration order/timing).
    e.stopPropagation();
    onContextMenu(e);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // role="button" + tabIndex={0} makes this focusable, but that alone doesn't make Enter/Space
    // activate it the way a real <button> gets for free - without this handler it just silently
    // does nothing for a keyboard user. `e.target !== e.currentTarget` guards against the
    // focusable checkbox below: without it, Space toggling the checkbox would bubble up here and
    // *also* open the entry at the same time.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.key === ' ') e.preventDefault(); // stop the page from scrolling on Space
      onClick();
    }
  }

  const classNames = ['entry-card', cover && 'has-cover', selected && 'selected'].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* A plain div, not a <label> wrapping the input - a <label> click forwards a *second*,
          synthetic click onto the input, which would double-fire onToggleSelect (once from the
          input's own onChange, once more from a naive onClick handler here reacting to the
          forwarded click). stopPropagation only, so the card's own onClick (open entry) never
          fires; the checkbox's onChange remains the single source of the toggle call. */}
      <div className="entry-card-select" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label="Select entry" />
      </div>
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
