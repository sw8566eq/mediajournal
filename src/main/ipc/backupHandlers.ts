import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { IPC } from '@shared/ipcChannels';
import { MEDIA_TYPES } from '@shared/types';
import { ExportFileSchema, FullExportFileSchema } from '@shared/validation';
import { buildExportData, buildFullExportData, importLibraryData, importFullLibraryData } from '../backup';
import { coversDir, importFromBuffer, removeCover, MAX_COVER_BYTES } from '../covers';
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

  ipcMain.handle(IPC.backup.exportFull, async (event) => {
    const filePath = await pickSaveFile(event, {
      title: 'Export Full Backup (with Cover Art)',
      defaultPath: `mediajournal-full-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    });
    if (!filePath) return null;

    const data = buildFullExportData();
    const zip = new AdmZip();
    zip.addFile('data.json', Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));

    // Every referenced cover file, deduped (covers are UUID-named, so more than one entry sharing
    // one is essentially impossible, but cheap to guard anyway). A file referenced in the DB but
    // missing on disk is skipped rather than failing the whole export.
    const coverFilenames = new Set<string>();
    for (const mediaType of MEDIA_TYPES) {
      for (const entry of data.entries[mediaType]) {
        const coverPath = (entry as { coverPath: string | null }).coverPath;
        if (coverPath) coverFilenames.add(coverPath);
      }
    }
    for (const filename of coverFilenames) {
      try {
        const bytes = await fs.readFile(path.join(coversDir(), filename));
        zip.addFile(`covers/${filename}`, bytes);
      } catch {
        // referenced file missing on disk - skip it, don't fail the whole export
      }
    }

    await fs.writeFile(filePath, zip.toBuffer());
    return filePath;
  });

  ipcMain.handle(IPC.backup.importFull, async (event) => {
    const filePath = await pickOpenFile(event, {
      title: 'Import Full Backup',
      properties: ['openFile'],
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    });
    if (!filePath) return null;

    const zip = new AdmZip(filePath);
    const dataEntry = zip.getEntry('data.json');
    if (!dataEntry) throw new Error("Not a valid full backup file (missing 'data.json').");
    const parsed = FullExportFileSchema.parse(JSON.parse(dataEntry.getData().toString('utf-8')));

    // Restore each referenced cover's bytes under a freshly-generated local filename (never the
    // backup's own - see covers.ts's importFromBuffer), building the old->new filename map
    // importFullLibraryData needs to rewrite each entry's coverPath. A cover referenced in
    // data.json but missing from the zip, or that fails validation (oversized/unsupported), is
    // just left uncovered rather than failing the whole import. Collected into a Set first (rather
    // than extracting inline in the loop below) so a cover shared by more than one entry is only
    // extracted once, and so the extractions can run concurrently - each is an independent zip
    // decompression + file write, with no reason to serialize them.
    const oldNames = new Set<string>();
    for (const mediaType of MEDIA_TYPES) {
      for (const entry of parsed.entries[mediaType]) {
        const oldName = (entry as { coverPath?: string | null }).coverPath;
        if (oldName) oldNames.add(oldName);
      }
    }

    const coverFileMap = new Map<string, string>();
    await Promise.all(
      [...oldNames].map(async (oldName) => {
        const zipEntry = zip.getEntry(`covers/${oldName}`);
        if (!zipEntry) return;
        try {
          // header.size is the zip's own declared uncompressed size, straight from the central
          // directory - checking it here rejects an oversized entry before ever decompressing it.
          // Without this, getData() below fully materializes the entry into memory first, and
          // importFromBuffer's own byteLength check only runs after that - so a corrupt/hostile
          // zip claiming a huge cover doesn't get bounded by the intended per-image memory cap.
          if (zipEntry.header.size > MAX_COVER_BYTES) return;
          const newName = await importFromBuffer(zipEntry.getData(), path.extname(oldName));
          coverFileMap.set(oldName, newName);
        } catch {
          // corrupt/oversized/unsupported image bytes - skip this one cover, the rest of the import still proceeds
        }
      }),
    );

    try {
      return importFullLibraryData(parsed, coverFileMap);
    } catch (err) {
      // importFullLibraryData's DB transaction rolls back entirely on failure (see importEntries
      // in ../backup.ts), but the cover files above were already written to disk before it ran -
      // clean those up too, so a failed import doesn't leave orphaned files behind and the
      // documented "entire import lands or nothing does" guarantee holds for covers as well as rows.
      await Promise.all([...coverFileMap.values()].map((filename) => removeCover(filename)));
      throw err;
    }
  });
}
