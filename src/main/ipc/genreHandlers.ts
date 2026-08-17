import { ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { GenreRenameSchema } from '@shared/validation';
import { genresRepo } from '../db/repositories/genres';

export function registerGenreHandlers(): void {
  ipcMain.handle(IPC.genres.list, () => genresRepo.list());

  ipcMain.handle(IPC.genres.rename, (_event, payload: unknown) => {
    const { oldName, newName } = GenreRenameSchema.parse(payload);
    const updated = genresRepo.rename(oldName, newName);
    return { updated };
  });
}
