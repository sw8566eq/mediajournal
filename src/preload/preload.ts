import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/ipcChannels';
import type {
  EntryFilters,
  EntryInput,
  EntryUpdate,
  MediaJournalAPI,
  MediaType,
  MediaTypeAPI,
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
  },
};

contextBridge.exposeInMainWorld('mediaJournalAPI', api);
