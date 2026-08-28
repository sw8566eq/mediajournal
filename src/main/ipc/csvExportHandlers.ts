import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { IPC } from '@shared/ipcChannels';
import { CsvExportSchema } from '@shared/validation';
import { pickSaveFile } from './dialogUtil';

/** The CSV text itself is built in the renderer (src/renderer/csvExport.ts) - it already has the
 *  currently filtered/sorted entries and the field-label config needed to format them. Main only
 *  owns the save-file dialog + disk write, matching every other export path in this app. */
export function registerCsvExportHandlers(): void {
  ipcMain.handle(IPC.csvExport.save, async (event, payload: unknown) => {
    const { mediaType, csv } = CsvExportSchema.parse(payload);
    const filePath = await pickSaveFile(event, {
      title: 'Export to CSV',
      defaultPath: `mediajournal-${mediaType}-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!filePath) return null;

    await fs.writeFile(filePath, csv, 'utf-8');
    return filePath;
  });
}
