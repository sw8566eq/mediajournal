// Thin re-export of the typed API the preload script exposed via contextBridge.
// Kept as its own module so components import from a stable local path rather than `window` directly.
export const api = window.mediaJournalAPI;
