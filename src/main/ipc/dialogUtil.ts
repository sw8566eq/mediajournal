import { BrowserWindow, dialog } from 'electron';

/**
 * Opens a native open-file dialog anchored to the window that sent the IPC event (falls back to
 * an unowned dialog if that window can't be resolved, e.g. it's already closed), returning the
 * chosen path or null if canceled/nothing picked. This exact "resolve the window, single-select,
 * canceled-or-empty check" shell was independently repeated at every open-file call site
 * (coverHandlers.ts, backupHandlers.ts's import, importHandlers.ts's own pickCsvFile) before being
 * pulled out here.
 */
export async function pickOpenFile(
  event: Electron.IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions,
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

/** Same shell as pickOpenFile, for a save-file dialog (backupHandlers.ts's export). */
export async function pickSaveFile(
  event: Electron.IpcMainInvokeEvent,
  options: Electron.SaveDialogOptions,
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
}
