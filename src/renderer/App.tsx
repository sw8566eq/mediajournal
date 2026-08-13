import { useState } from 'react';
import type { MediaType, Tag } from '@shared/types';
import { Sidebar } from './components/layout/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { EntryForm, type EntryFormValues } from './components/entry/EntryForm';
import { EntryDetail } from './components/entry/EntryDetail';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { useTags } from './hooks/useTags';
import { api } from './api/client';

type View = { name: 'library' } | { name: 'form'; entryId: number | null } | { name: 'detail'; entryId: number };

export default function App() {
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [view, setView] = useState<View>({ name: 'library' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailEntry, setDetailEntry] = useState<Record<string, unknown> | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<EntryFormValues> | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const { tags, createTag } = useTags();

  function selectMediaType(type: MediaType) {
    setMediaType(type);
    setView({ name: 'library' });
  }

  async function openDetail(id: number) {
    const entry = await api[mediaType].get(id);
    setDetailEntry(entry as unknown as Record<string, unknown>);
    setView({ name: 'detail', entryId: id });
  }

  function openCreateForm() {
    setFormInitial(undefined);
    setView({ name: 'form', entryId: null });
  }

  async function openEditForm(id: number) {
    const entry = await api[mediaType].get(id);
    if (!entry) return;
    const { tags: entryTags, id: _id, createdAt, updatedAt, ...rest } = entry as unknown as Record<string, unknown> & {
      tags: Tag[];
    };
    setFormInitial({ ...rest, tagIds: entryTags.map((t) => t.id) } as Partial<EntryFormValues>);
    setView({ name: 'form', entryId: id });
  }

  async function handleSubmit(values: EntryFormValues) {
    if (view.name === 'form' && view.entryId !== null) {
      await api[mediaType].update(view.entryId, values);
    } else {
      await api[mediaType].create(values as never);
    }
    setRefreshKey((k) => k + 1);
    setView({ name: 'library' });
  }

  function handleDelete(id: number) {
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (pendingDeleteId === null) return;
    const coverPath = detailEntry?.coverPath as string | null | undefined;
    await api[mediaType].delete(pendingDeleteId);
    if (coverPath) await api.covers.remove(coverPath);
    setPendingDeleteId(null);
    setRefreshKey((k) => k + 1);
    setView({ name: 'library' });
  }

  return (
    <div className="app-shell">
      <Sidebar active={mediaType} onSelect={selectMediaType} />
      <main className="app-content">
        {view.name === 'library' && (
          <LibraryView
            mediaType={mediaType}
            allTags={tags}
            onSelectEntry={openDetail}
            onAddClick={openCreateForm}
            refreshKey={refreshKey}
          />
        )}
        {view.name === 'form' && (
          <EntryForm
            mediaType={mediaType}
            initialValues={formInitial}
            allTags={tags}
            onCreateTag={createTag}
            onSubmit={handleSubmit}
            onCancel={() => setView({ name: 'library' })}
          />
        )}
        {view.name === 'detail' && detailEntry && (
          <EntryDetail
            mediaType={mediaType}
            entry={detailEntry}
            onEdit={() => openEditForm(view.entryId)}
            onDelete={() => handleDelete(view.entryId)}
            onBack={() => setView({ name: 'library' })}
          />
        )}
      </main>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        message="Delete this entry? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
