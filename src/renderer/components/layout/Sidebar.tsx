import type { MediaType } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';

interface Props {
  active: MediaType;
  onSelect: (type: MediaType) => void;
}

export function Sidebar({ active, onSelect }: Props) {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Media Journal</div>
      <ul>
        {MEDIA_TYPE_ORDER.map((type) => (
          <li key={type}>
            <button
              type="button"
              className={type === active ? 'nav-item active' : 'nav-item'}
              onClick={() => onSelect(type)}
            >
              {MEDIA_TYPE_LABELS[type]}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
