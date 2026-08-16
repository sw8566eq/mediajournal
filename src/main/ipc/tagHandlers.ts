import { ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { TagNameSchema } from '@shared/validation';
import { tagRepo } from '../db/repositories/tags';

export function registerTagHandlers(): void {
  ipcMain.handle(IPC.tags.list, () => tagRepo.list());

  ipcMain.handle(IPC.tags.create, (_event, name: unknown) => {
    const parsed = TagNameSchema.parse(name);
    return tagRepo.create(parsed);
  });

  ipcMain.handle(IPC.tags.delete, (_event, id: number) => tagRepo.delete(id));

  ipcMain.handle(IPC.tags.rename, (_event, payload: { id: number; name: unknown }) => {
    const name = TagNameSchema.parse(payload.name);
    return tagRepo.rename(payload.id, name);
  });
}
