import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const ALLOWED_EXTS = new Set(Object.values(MIME_TO_EXT));

export function coversDir(): string {
  return path.join(app.getPath('userData'), 'covers');
}

async function ensureCoversDir(): Promise<void> {
  await fs.mkdir(coversDir(), { recursive: true });
}

/** Copies a local image file (chosen via the native file dialog) into app storage. Returns the stored filename. */
export async function importFromFilePath(sourcePath: string): Promise<string> {
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.');
  }

  const stat = await fs.stat(sourcePath);
  if (stat.size > MAX_COVER_BYTES) {
    throw new Error('Image file is too large (max 8MB).');
  }

  await ensureCoversDir();
  const filename = `${randomUUID()}${ext}`;
  await fs.copyFile(sourcePath, path.join(coversDir(), filename));
  return filename;
}

/** Downloads an image from a URL into app storage, validating it's actually an image and within the size cap. Returns the stored filename. */
export async function importFromUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('That doesn\'t look like a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http/https image URLs are supported.');
  }

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Couldn't download that image (HTTP ${response.status}).`);
  }

  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = MIME_TO_EXT[contentType];
  if (!ext) {
    throw new Error(`Unsupported image type: ${contentType || 'unknown'}. Use JPG, PNG, WEBP, or GIF.`);
  }

  // Reject early from the Content-Length header when present, before reading the body - avoids
  // fully buffering a large/malicious response into memory just to reject it afterward. Not
  // airtight (a server can omit or lie about this header, or use chunked encoding), so the
  // post-download byteLength check below still stands as the authoritative guard.
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_COVER_BYTES) {
    throw new Error('Image is too large (max 8MB).');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_COVER_BYTES) {
    throw new Error('Image is too large (max 8MB).');
  }

  await ensureCoversDir();
  const filename = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(coversDir(), filename), buffer);
  return filename;
}

/** Best-effort delete; ignores a missing file (e.g. already removed). */
export async function removeCover(filename: string): Promise<void> {
  try {
    await fs.unlink(path.join(coversDir(), path.basename(filename)));
  } catch {
    // already gone; nothing to do
  }
}

/** Writes a raw image buffer into app storage under a fresh random filename - the zip-import
 *  counterpart to importFromFilePath/importFromUrl above, used when restoring a full (with-covers)
 *  backup where the image bytes come from inside the backup zip rather than disk or a URL. Never
 *  reuses the backup's own filename, so a restore can't collide with (or overwrite) an existing
 *  local cover - see backupHandlers.ts's importFull handler. */
export async function importFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase();
  if (!ALLOWED_EXTS.has(normalizedExt)) {
    throw new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.');
  }
  if (buffer.byteLength > MAX_COVER_BYTES) {
    throw new Error('Image file is too large (max 8MB).');
  }

  await ensureCoversDir();
  const filename = `${randomUUID()}${normalizedExt}`;
  await fs.writeFile(path.join(coversDir(), filename), buffer);
  return filename;
}
