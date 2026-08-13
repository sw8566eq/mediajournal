import type { MediaJournalAPI } from '@shared/types';

declare global {
  interface Window {
    mediaJournalAPI: MediaJournalAPI;
  }
}

export {};
