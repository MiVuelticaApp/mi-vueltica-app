import { ValidationError } from '../api';
import { t } from '@/i18n/es-CR';
import type { HttpClient } from './client';
import type { UploadDto } from './dto';

/** Already on the server (a photo that came from the API, or an upload that was sent before). */
const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

/** Uploads can be up to 10 MB on a phone connection: give them longer than the 15 s used for JSON calls. */
export const UPLOAD_TIMEOUT_MS = 60_000;

/** The file's real type from its name (`.png`, `.webp`, …); the API takes JPEG / PNG / WebP. Defaults to JPEG. */
export function photoTypeOf(uri: string): { name: string; type: string } {
  const ext = uri.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return { name: 'photo.png', type: 'image/png' };
  if (ext === 'webp') return { name: 'photo.webp', type: 'image/webp' };
  return { name: 'photo.jpg', type: 'image/jpeg' };
}

/**
 * `POST /uploads` (multipart, field `file`, signed-in only). The API re-encodes to JPEG, strips EXIF/GPS and answers the
 * durable URL to send in `data.photos`, review `photos` or a verification / report `photo`.
 */
export async function uploadPhoto(http: HttpClient, uri: string): Promise<string> {
  if (isRemote(uri)) return uri;
  const form = new FormData();
  if (/^(blob|data):/i.test(uri)) {
    // The web picker gives blob: / data: URIs; the blob knows its own type.
    const blob = await (await fetch(uri)).blob();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    form.append('file', blob, `photo.${ext}`);
  } else {
    // React Native's FormData streams the file from its URI.
    form.append('file', { uri, ...photoTypeOf(uri) } as unknown as Blob);
  }
  try {
    const res = await http.request<UploadDto>('POST', '/uploads', { form, auth: 'required', reason: 'contribute', timeoutMs: UPLOAD_TIMEOUT_MS });
    return res.url;
  } catch (e) {
    // 413 (too big) / 415 (HEIC or another format) / 422: say what is wrong with the photo, not "algo salió mal".
    if (e instanceof ValidationError) throw new ValidationError('photo', t.upload.rejected);
    throw e;
  }
}

/** Uploads in order (keeps the gallery order and the per-user rate limit friendly). */
export async function uploadPhotos(http: HttpClient, uris: string[], max: number): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris.slice(0, max)) out.push(await uploadPhoto(http, uri));
  return out;
}
