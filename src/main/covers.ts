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
