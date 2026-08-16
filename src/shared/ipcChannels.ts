import { MEDIA_TYPES, type MediaType } from './types';

/** Single source of truth for IPC channel names, shared by preload (sender) and main (handler). */
function mediaChannels(type: MediaType) {
  return {
    list: `${type}:list`,
    get: `${type}:get`,
    create: `${type}:create`,
    update: `${type}:update`,
    delete: `${type}:delete`,
  } as const;
}

export const IPC = {
  movie: mediaChannels('movie'),
  tv: mediaChannels('tv'),
  book: mediaChannels('book'),
  album: mediaChannels('album'),
  game: mediaChannels('game'),
  tags: {
    list: 'tags:list',
    create: 'tags:create',
    delete: 'tags:delete',
  },
  covers: {
    pickFromDisk: 'covers:pickFromDisk',
    importFromUrl: 'covers:importFromUrl',
    remove: 'covers:remove',
  },
  externalSearch: {
    search: 'externalSearch:search',
  },
  backup: {
    export: 'backup:export',
    import: 'backup:import',
  },
  filterPresets: {
    list: 'filterPresets:list',
    create: 'filterPresets:create',
    delete: 'filterPresets:delete',
  },
} as const;

/** Custom protocol scheme cover images are served from in the renderer, e.g. `media-cover://<filename>`. */
export const COVER_PROTOCOL = 'media-cover';

export const MEDIA_TYPES_LIST = MEDIA_TYPES;
