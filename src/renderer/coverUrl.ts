import { COVER_PROTOCOL } from '@shared/ipcChannels';

/** Builds the `media-cover://` URL an `<img>` can load for a stored cover filename. */
export function coverUrl(filename: string | null | undefined): string | null {
  return filename ? `${COVER_PROTOCOL}://${filename}` : null;
}
