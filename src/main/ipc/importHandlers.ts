// Thin, DB-touching IPC layer for importing Goodreads/Letterboxd CSV exports - untested by
// convention, same as backupHandlers.ts (see CLAUDE.md's testing-scope-boundary note). All the
// risky row-parsing/validation logic lives in the pure, unit-tested ../importers/* modules; this
// file only does the file dialog, existing-library dedupe, and handing surviving rows to the
// existing, unmodified importLibraryData().
import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { IPC } from '@shared/ipcChannels';
import type { ExportedBookEntry, ExportedMovieEntry } from '@shared/validation';
import type { SourceImportSummary } from '@shared/types';
import type { MediaRepository } from '../db/repositories/mediaRepository';
import { bookRepo } from '../db/repositories/books';
import { movieRepo } from '../db/repositories/movies';
import { importLibraryData } from '../backup';
import { parseGoodreadsCsv } from '../importers/goodreads';
import { parseLetterboxdCsv } from '../importers/letterboxd';
import { dedupeAgainstExisting, capWarnings, type ParsedImport } from '../importers/shared';

type ImportPayload = Parameters<typeof importLibraryData>[0];
type SourceEntry = ExportedBookEntry | ExportedMovieEntry;

async function pickCsvFile(event: Electron.IpcMainInvokeEvent, title: string): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const options: Electron.OpenDialogOptions = {
    title,
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

/** Dedupes parsed rows against the existing library (by title, case-insensitive, +year when both
 *  sides have one - see isSameItem), then hands the survivors to the existing importLibraryData()
 *  unchanged, layering its plain counts into the richer SourceImportSummary shape. */
function mergeImportedEntries<T extends 'book' | 'movie'>(
  mediaType: T,
  repo: MediaRepository<T>,
  parsed: ParsedImport<SourceEntry>,
): SourceImportSummary {
  const existing = repo.list({}) as { title: string; year?: number | null }[];
  const { surviving, skippedDuplicate } = dedupeAgainstExisting(parsed.entries, existing);

  const entries: ImportPayload['entries'] = { movie: [], tv: [], book: [], album: [], game: [] };
  entries[mediaType] = surviving as never;

  const result = importLibraryData({ exportedAt: new Date().toISOString(), tags: [], entries });

  return {
    ...result,
    skippedDuplicate,
    skippedInvalid: parsed.skippedInvalid,
    warnings: capWarnings(parsed.warnings),
  };
}

export function registerImportHandlers(): void {
  ipcMain.handle(IPC.import.goodreads, async (event) => {
    const filePath = await pickCsvFile(event, 'Import from Goodreads');
    if (!filePath) return null;
    const csvText = await fs.readFile(filePath, 'utf-8');
    const parsed = parseGoodreadsCsv(csvText);
    return mergeImportedEntries('book', bookRepo, parsed);
  });

  ipcMain.handle(IPC.import.letterboxd, async (event) => {
    const filePath = await pickCsvFile(event, 'Import from Letterboxd');
    if (!filePath) return null;
    const csvText = await fs.readFile(filePath, 'utf-8');
    const parsed = parseLetterboxdCsv(csvText);
    return mergeImportedEntries('movie', movieRepo, parsed);
  });
}
