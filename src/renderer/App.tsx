import { useState } from 'react';
import type { MediaType, Tag } from '@shared/types';
import { Sidebar } from './components/layout/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { AllLibraryView } from './components/library/AllLibraryView';
import { EntryForm, type EntryFormValues } from './components/entry/EntryForm';
import { EntryDetail } from './components/entry/EntryDetail';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { SettingsView } from './components/settings/SettingsView';
import { StatsView } from './components/stats/StatsView';
import { useTags } from './hooks/useTags';
import { useFilterPresets } from './hooks/useFilterPresets';
import { api } from './api/client';

type View =
  | { name: 'library' }
  | { name: 'form'; mediaType: MediaType; entryId: number | null }
  | { name: 'detail'; mediaType: MediaType; entryId: number }
  | { name: 'settings' }
  | { name: 'stats' };

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
  const { tags, createTag, deleteTag, renameTag, refetch: refetchTags } = useTags();
  const { presets, createPreset, deletePreset } = useFilterPresets();

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
    const { tags: entryTags, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = entry as unknown as Record<string, unknown> & {
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
    // Fetched fresh rather than read off `detailEntry` - delete can now be triggered straight from
    // a grid card's right-click menu, with no detail view ever opened (detailEntry null or, worse,
    // still holding a *different* previously-viewed entry's data, which would delete the wrong
    // entry's cover file).
    const entry = await api[pendingDelete.mediaType].get(pendingDelete.id);
    const coverPath = (entry as { coverPath?: string | null } | null)?.coverPath;
    await api[pendingDelete.mediaType].delete(pendingDelete.id);
    if (coverPath) await api.covers.remove(coverPath);
    setPendingDelete(null);
    setRefreshKey((k) => k + 1);
    setView({ name: 'library' });
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={view.name === 'settings' || view.name === 'stats' ? view.name : activeMediaType}
        onSelect={selectMediaType}
        onSelectSettings={() => setView({ name: 'settings' })}
        onSelectStats={() => setView({ name: 'stats' })}
      />
      <main className="app-content">
        {view.name === 'settings' && <SettingsView onImported={refetchTags} />}
        {view.name === 'stats' && <StatsView />}
        {view.name === 'library' && activeMediaType === 'all' && (
          <AllLibraryView
            allTags={tags}
            onSelectEntry={openDetail}
            onEditEntry={openEditForm}
            onDeleteEntry={handleDelete}
            refreshKey={refreshKey}
            presets={presets}
            onSavePreset={createPreset}
            onDeletePreset={deletePreset}
            onDeleteTag={deleteTag}
            onRenameTag={renameTag}
          />
        )}
        {view.name === 'library' && activeMediaType !== 'all' && (
          <LibraryView
            mediaType={activeMediaType}
            allTags={tags}
            onSelectEntry={openDetail}
            onEditEntry={openEditForm}
            onDeleteEntry={handleDelete}
            onAddClick={openCreateForm}
            refreshKey={refreshKey}
            presets={presets}
            onSavePreset={createPreset}
            onDeletePreset={deletePreset}
            onDeleteTag={deleteTag}
            onRenameTag={renameTag}
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
