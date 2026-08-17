import type { MediaType, SourceImportSummary } from '@shared/types';
import { MEDIA_TYPE_LABELS } from './mediaTypeConfig';

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
