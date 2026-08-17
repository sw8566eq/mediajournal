import { ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { importFromFilePath, importFromUrl, removeCover } from '../covers';
import { pickOpenFile } from './dialogUtil';

export function registerCoverHandlers(): void {
  ipcMain.handle(IPC.covers.pickFromDisk, async (event) => {
    const filePath = await pickOpenFile(event, {
      title: 'Select cover image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    return filePath ? importFromFilePath(filePath) : null;
  });

  ipcMain.handle(IPC.covers.importFromUrl, (_event, url: string) => importFromUrl(url));

  ipcMain.handle(IPC.covers.remove, (_event, filename: string) => removeCover(filename));
}
