import { useState } from 'react';
import type { Tag } from '@shared/types';

interface Props {
  allTags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
}

/** Multi-select against the shared global tag list, with inline "create new tag". */
export function TagPicker({ allTags, selectedIds, onChange, onCreateTag }: Props) {
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(name);
      onChange(selectedIds.includes(tag.id) ? selectedIds : [...selectedIds, tag.id]);
      setNewTagName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="field tag-picker">
      <span>Tags</span>
      <div className="tag-list">
        {allTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={selectedIds.includes(tag.id) ? 'tag-chip active' : 'tag-chip'}
            onClick={() => toggle(tag.id)}
          >
            {tag.name}
          </button>
        ))}
        {allTags.length === 0 && <span className="hint">No tags yet</span>}
      </div>
      <div className="tag-create">
        <input
          type="text"
          placeholder="New tag name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <button type="button" onClick={handleCreate} disabled={creating || !newTagName.trim()}>
          Add Tag
        </button>
      </div>
    </div>
  );
}
