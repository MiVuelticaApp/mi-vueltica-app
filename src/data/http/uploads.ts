import type { HttpClient } from './client';
import type { UploadDto } from './dto';

/** Already on the server (a photo that came from the API, or an upload that was sent before). */
const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

/**
 * `POST /uploads` (multipart, field `file`, signed-in only). The API re-encodes to JPEG, strips EXIF/GPS and answers the
 * durable URL to send in `data.photos`, review `photos` or a verification / report `photo`.
 */
export async function uploadPhoto(http: HttpClient, uri: string): Promise<string> {
  if (isRemote(uri)) return uri;
  const form = new FormData();
  if (/^(blob|data):/i.test(uri)) {
    // The web picker gives blob: / data: URIs.
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'photo.jpg');
  } else {
    // React Native's FormData streams the file from its URI.
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  const res = await http.request<UploadDto>('POST', '/uploads', { form, auth: 'required', reason: 'contribute' });
  return res.url;
}

/** Uploads in order (keeps the gallery order and the per-user rate limit friendly). */
export async function uploadPhotos(http: HttpClient, uris: string[], max: number): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris.slice(0, max)) out.push(await uploadPhoto(http, uri));
  return out;
}
