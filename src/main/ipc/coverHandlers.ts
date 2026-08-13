import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { importFromFilePath, importFromUrl, removeCover } from '../covers';

export function registerCoverHandlers(): void {
  ipcMain.handle(IPC.covers.pickFromDisk, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Select cover image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return importFromFilePath(result.filePaths[0]);
  });

  ipcMain.handle(IPC.covers.importFromUrl, (_event, url: string) => importFromUrl(url));

  ipcMain.handle(IPC.covers.remove, (_event, filename: string) => removeCover(filename));
}
