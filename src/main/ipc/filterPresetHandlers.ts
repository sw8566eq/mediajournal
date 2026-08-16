import { ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { NewFilterPresetSchema } from '@shared/validation';
import { filterPresetsRepo } from '../db/repositories/filterPresets';

export function registerFilterPresetHandlers(): void {
  ipcMain.handle(IPC.filterPresets.list, () => filterPresetsRepo.list());

  ipcMain.handle(IPC.filterPresets.create, (_event, data: unknown) => {
    const parsed = NewFilterPresetSchema.parse(data);
    return filterPresetsRepo.create(parsed);
  });

  ipcMain.handle(IPC.filterPresets.delete, (_event, id: number) => filterPresetsRepo.delete(id));
}
