import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { IPC } from '@shared/ipcChannels';
import { ExportFileSchema } from '@shared/validation';
import { buildExportData, importLibraryData } from '../backup';
import { pickOpenFile, pickSaveFile } from './dialogUtil';

export function registerBackupHandlers(): void {
  ipcMain.handle(IPC.backup.export, async (event) => {
    const filePath = await pickSaveFile(event, {
      title: 'Export Library',
      defaultPath: `mediajournal-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return null;

    const data = buildExportData();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  });

  ipcMain.handle(IPC.backup.import, async (event) => {
    const filePath = await pickOpenFile(event, {
      title: 'Import Library',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return null;

    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = ExportFileSchema.parse(JSON.parse(raw));
    return importLibraryData(parsed);
  });
}
