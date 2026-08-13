import { app, BrowserWindow } from 'electron';
import { getDb, closeDb } from './db/connection';
import { migrate } from './db/migrate';
import { registerHandlers } from './ipc/registerHandlers';
import { createMainWindow } from './window';

async function bootstrap(): Promise<void> {
  const db = getDb();
  migrate(db);
  registerHandlers();
  createMainWindow();
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  closeDb();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
