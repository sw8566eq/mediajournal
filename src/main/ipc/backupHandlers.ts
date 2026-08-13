import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { IPC } from '@shared/ipcChannels';
import { ExportFileSchema } from '@shared/validation';
import { buildExportData, importLibraryData } from '../backup';

export function registerBackupHandlers(): void {
  ipcMain.handle(IPC.backup.export, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.SaveDialogOptions = {
      title: 'Export Library',
      defaultPath: `mediajournal-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return null;

    const data = buildExportData();
    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return result.filePath;
  });

  ipcMain.handle(IPC.backup.import, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Import Library',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;

    const raw = await fs.readFile(result.filePaths[0], 'utf-8');
    const parsed = ExportFileSchema.parse(JSON.parse(raw));
    return importLibraryData(parsed);
  });
}
