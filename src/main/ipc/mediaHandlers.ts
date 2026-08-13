import { ipcMain } from 'electron';
import type { z } from 'zod';
import { IPC } from '@shared/ipcChannels';
import type { EntryFilters, MediaType } from '@shared/types';
import { EntryFiltersSchema } from '@shared/validation';
import type { MediaRepository } from '../db/repositories/mediaRepository';

interface RegisterMediaHandlersArgs<T extends MediaType> {
  mediaType: T;
  repo: MediaRepository<T>;
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
}

/** Wires the list/get/create/update/delete IPC channels for one media type to its repository, validating payloads with zod first. */
export function registerMediaHandlers<T extends MediaType>({
  mediaType,
  repo,
  createSchema,
  updateSchema,
}: RegisterMediaHandlersArgs<T>): void {
  const channels = IPC[mediaType];

  ipcMain.handle(channels.list, (_event, filters?: EntryFilters) => {
    const parsed = filters ? EntryFiltersSchema.parse(filters) : {};
    return repo.list(parsed);
  });

  ipcMain.handle(channels.get, (_event, id: number) => repo.get(id));

  ipcMain.handle(channels.create, (_event, data: unknown) => {
    const parsed = createSchema.parse(data);
    return repo.create(parsed);
  });

  ipcMain.handle(channels.update, (_event, id: number, data: unknown) => {
    const parsed = updateSchema.parse(data);
    return repo.update(id, parsed);
  });

  ipcMain.handle(channels.delete, (_event, id: number) => repo.delete(id));
}
