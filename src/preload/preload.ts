import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/ipcChannels';
import type {
  EntryFilters,
  EntryInput,
  EntryUpdate,
  MediaJournalAPI,
  MediaType,
  MediaTypeAPI,
  NewFilterPreset,
} from '@shared/types';

function buildMediaAPI<T extends MediaType>(mediaType: T): MediaTypeAPI<T> {
  const channels = IPC[mediaType];
  return {
    list: (filters?: EntryFilters) => ipcRenderer.invoke(channels.list, filters),
    get: (id: number) => ipcRenderer.invoke(channels.get, id),
    create: (data: EntryInput<T>) => ipcRenderer.invoke(channels.create, data),
    update: (id: number, data: EntryUpdate<T>) => ipcRenderer.invoke(channels.update, id, data),
    delete: (id: number) => ipcRenderer.invoke(channels.delete, id),
  };
}

const api: MediaJournalAPI = {
  movie: buildMediaAPI('movie'),
  tv: buildMediaAPI('tv'),
  book: buildMediaAPI('book'),
  album: buildMediaAPI('album'),
  game: buildMediaAPI('game'),
  tags: {
    list: () => ipcRenderer.invoke(IPC.tags.list),
    create: (name: string) => ipcRenderer.invoke(IPC.tags.create, name),
    delete: (id: number) => ipcRenderer.invoke(IPC.tags.delete, id),
    rename: (id: number, name: string) => ipcRenderer.invoke(IPC.tags.rename, { id, name }),
  },
  covers: {
    pickFromDisk: () => ipcRenderer.invoke(IPC.covers.pickFromDisk),
    importFromUrl: (url: string) => ipcRenderer.invoke(IPC.covers.importFromUrl, url),
    remove: (filename: string) => ipcRenderer.invoke(IPC.covers.remove, filename),
  },
  externalSearch: {
    search: (mediaType: MediaType, query: string) =>
      ipcRenderer.invoke(IPC.externalSearch.search, { mediaType, query }),
  },
  backup: {
    exportLibrary: () => ipcRenderer.invoke(IPC.backup.export),
    importLibrary: () => ipcRenderer.invoke(IPC.backup.import),
  },
  filterPresets: {
    list: () => ipcRenderer.invoke(IPC.filterPresets.list),
    create: (data: NewFilterPreset) => ipcRenderer.invoke(IPC.filterPresets.create, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.filterPresets.delete, id),
  },
  genres: {
    list: () => ipcRenderer.invoke(IPC.genres.list),
    rename: (oldName: string, newName: string) => ipcRenderer.invoke(IPC.genres.rename, { oldName, newName }),
  },
  import: {
    importGoodreads: () => ipcRenderer.invoke(IPC.import.goodreads),
    importLetterboxd: () => ipcRenderer.invoke(IPC.import.letterboxd),
  },
};

contextBridge.exposeInMainWorld('mediaJournalAPI', api);
