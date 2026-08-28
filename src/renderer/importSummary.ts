import type { ImportSummary, MediaType, SourceImportSummary } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER } from './mediaTypeConfig';

/**
 * Formats a JSON backup:import result (see SettingsView.tsx's handleImport/handleImportFull -
 * both the plain and the full-with-covers backup import return the same ImportSummary shape) into
 * one human-readable sentence.
 */
export function formatImportSummary(summary: ImportSummary): string {
  const parts = MEDIA_TYPE_ORDER.filter((type) => summary[type] > 0).map((type) => `${summary[type]} ${MEDIA_TYPE_LABELS[type]}`);
  const tagsPart = summary.tags > 0 ? `${summary.tags} tag${summary.tags === 1 ? '' : 's'}` : null;
  const allParts = [...parts, tagsPart].filter(Boolean);
  return allParts.length ? `Imported ${allParts.join(', ')}.` : 'Nothing to import - the file was empty.';
}

/**
 * Formats a Goodreads/Letterboxd CSV-import result (see SettingsView.tsx) into one human-readable
 * sentence. Unlike the JSON backup:import summary, this never mentions a tag count:
 * importLibraryData() only increments its `tags` count from a *top-level* tag list, which the CSV
 * importers never populate (each row's own tags are still resolved and applied, same as JSON
 * import - just not separately counted) - showing "0 tags" here would misleadingly suggest none
 * of the imported tags were kept.
 */
export function formatSourceImportSummary(summary: SourceImportSummary, mediaType: MediaType): string {
  const count = summary[mediaType];
  const parts: string[] = [count > 0 ? `Imported ${count} ${MEDIA_TYPE_LABELS[mediaType]}.` : 'Nothing new to import.'];

  if (summary.skippedDuplicate > 0) {
    parts.push(`Skipped ${summary.skippedDuplicate} already in your library.`);
  }
  if (summary.skippedInvalid > 0) {
    parts.push(`Skipped ${summary.skippedInvalid} row${summary.skippedInvalid === 1 ? '' : 's'} that couldn't be read.`);
  }

  return parts.join(' ');
}
