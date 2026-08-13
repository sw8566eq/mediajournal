import { useState } from 'react';
import type { MediaType, Tag } from '@shared/types';
import { Sidebar } from './components/layout/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { AllLibraryView } from './components/library/AllLibraryView';
import { EntryForm, type EntryFormValues } from './components/entry/EntryForm';
import { EntryDetail } from './components/entry/EntryDetail';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { SettingsView } from './components/settings/SettingsView';
import { useTags } from './hooks/useTags';
import { api } from './api/client';

type View =
  | { name: 'library' }
  | { name: 'form'; mediaType: MediaType; entryId: number | null }
  | { name: 'detail'; mediaType: MediaType; entryId: number }
  | { name: 'settings' };

export default function App() {
  // The sidebar's current selection - 'all' spans every media type in one combined view.
  // Distinct from a specific entry's own type (tracked per-view below), since opening an entry
  // from the "All" view must still operate on that entry's real type regardless of which tab
  // happens to be active.
  const [activeMediaType, setActiveMediaType] = useState<MediaType | 'all'>('movie');
  const [view, setView] = useState<View>({ name: 'library' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailEntry, setDetailEntry] = useState<Record<string, unknown> | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<EntryFormValues> | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<{ mediaType: MediaType; id: number } | null>(null);
  const { tags, createTag, refetch: refetchTags } = useTags();

  function selectMediaType(type: MediaType | 'all') {
    setActiveMediaType(type);
    setView({ name: 'library' });
  }

  async function openDetail(mediaType: MediaType, id: number) {
    const entry = await api[mediaType].get(id);
    setDetailEntry(entry as unknown as Record<string, unknown>);
    setView({ name: 'detail', mediaType, entryId: id });
  }

  function openCreateForm() {
    if (activeMediaType === 'all') return; // guarded: the "All" view never renders the Add button
    setFormInitial(undefined);
    setView({ name: 'form', mediaType: activeMediaType, entryId: null });
  }

  async function openEditForm(mediaType: MediaType, id: number) {
    const entry = await api[mediaType].get(id);
    if (!entry) return;
    const { tags: entryTags, id: _id, createdAt, updatedAt, ...rest } = entry as unknown as Record<string, unknown> & {
      tags: Tag[];
    };
    setFormInitial({ ...rest, tagIds: entryTags.map((t) => t.id) } as Partial<EntryFormValues>);
    setView({ name: 'form', mediaType, entryId: id });
  }

  async function handleSubmit(values: EntryFormValues) {
    if (view.name !== 'form') return;
    if (view.entryId !== null) {
      await api[view.mediaType].update(view.entryId, values);
    } else {
      await api[view.mediaType].create(values as never);
    }
    setRefreshKey((k) => k + 1);
    setView({ name: 'library' });
  }

  function handleDelete(mediaType: MediaType, id: number) {
    setPendingDelete({ mediaType, id });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const coverPath = detailEntry?.coverPath as string | null | undefined;
    await api[pendingDelete.mediaType].delete(pendingDelete.id);
    if (coverPath) await api.covers.remove(coverPath);
    setPendingDelete(null);
    setRefreshKey((k) => k + 1);
    setView({ name: 'library' });
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={view.name === 'settings' ? 'settings' : activeMediaType}
        onSelect={selectMediaType}
        onSelectSettings={() => setView({ name: 'settings' })}
      />
      <main className="app-content">
        {view.name === 'settings' && <SettingsView onImported={refetchTags} />}
        {view.name === 'library' && activeMediaType === 'all' && (
          <AllLibraryView allTags={tags} onSelectEntry={openDetail} refreshKey={refreshKey} />
        )}
        {view.name === 'library' && activeMediaType !== 'all' && (
          <LibraryView
            mediaType={activeMediaType}
            allTags={tags}
            onSelectEntry={openDetail}
            onAddClick={openCreateForm}
            refreshKey={refreshKey}
          />
        )}
        {view.name === 'form' && (
          <EntryForm
            mediaType={view.mediaType}
            initialValues={formInitial}
            allTags={tags}
            onCreateTag={createTag}
            onSubmit={handleSubmit}
            onCancel={() => setView({ name: 'library' })}
          />
        )}
        {view.name === 'detail' && detailEntry && (
          <EntryDetail
            mediaType={view.mediaType}
            entry={detailEntry}
            onEdit={() => openEditForm(view.mediaType, view.entryId)}
            onDelete={() => handleDelete(view.mediaType, view.entryId)}
            onBack={() => setView({ name: 'library' })}
          />
        )}
      </main>
      <ConfirmDialog
        open={pendingDelete !== null}
        message="Delete this entry? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
