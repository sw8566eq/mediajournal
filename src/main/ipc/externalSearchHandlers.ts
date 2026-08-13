import { ipcMain } from 'electron';
import { IPC } from '@shared/ipcChannels';
import { ExternalSearchQuerySchema } from '@shared/validation';
import type { ExternalSearchResponse } from '@shared/types';
import { PROVIDERS } from '../externalApis';

export function registerExternalSearchHandlers(): void {
  ipcMain.handle(IPC.externalSearch.search, async (_event, payload: unknown): Promise<ExternalSearchResponse> => {
    const { mediaType, query } = ExternalSearchQuerySchema.parse(payload);
    const provider = PROVIDERS[mediaType];
    if (!provider) {
      return { status: 'not_configured' };
    }

    try {
      const results = await provider.search(query);
      return { status: 'ok', results };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  });
}
