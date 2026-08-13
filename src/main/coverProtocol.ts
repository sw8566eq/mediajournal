import { net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { COVER_PROTOCOL } from '@shared/ipcChannels';
import { coversDir } from './covers';

/**
 * Must run before `app.whenReady()` — Electron requires privileged custom schemes to be
 * declared at module load time. Serves cover images to the renderer as `media-cover://<filename>`
 * instead of loosening the CSP to allow raw `file://` URLs.
 */
export function registerCoverProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: COVER_PROTOCOL,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false },
    },
  ]);
}

/** Call once the app is ready: maps `media-cover://<filename>` to the matching file in the covers directory. */
export function registerCoverProtocolHandler(): void {
  protocol.handle(COVER_PROTOCOL, (request) => {
    const url = new URL(request.url);
    // path.basename strips any directory components, preventing path traversal via a crafted filename.
    const filename = path.basename(decodeURIComponent(url.hostname));
    const filePath = path.join(coversDir(), filename);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}
