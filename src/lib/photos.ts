import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/components/ui/Toast';
import { t } from '@/i18n/es-CR';

/** `POST /uploads` limits (#15): 10 MB, JPEG / PNG / WebP (HEIC answers 415). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = /^image\/(jpe?g|png|webp)$/i;

/** Whether the API would take this picked image. Unknown size or type (some platforms leave them out) is let through. */
export function isUploadable(a: Pick<ImagePicker.ImagePickerAsset, 'fileSize' | 'mimeType'>): boolean {
  if (a.fileSize != null && a.fileSize > MAX_PHOTO_BYTES) return false;
  if (a.mimeType && !ACCEPTED_TYPES.test(a.mimeType)) return false;
  return true;
}

/**
 * Opens the system photo picker and returns the selected image URIs (max `limit`). Photos the API would refuse
 * (over 10 MB, or HEIC and other formats it does not take) are left out with a message.
 */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.status !== 'undetermined') return [];
    // `Compatible` makes iOS hand over JPEG instead of HEIC (the API answers 415 to HEIC, #41); the API re-encodes anyway.
    // Android has no such option, so a HEIC pick there is caught by `isUploadable`.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled) return [];
    const picked = res.assets.slice(0, limit);
    const ok = picked.filter(isUploadable);
    if (ok.length < picked.length) toast(t.upload.skipped);
    return ok.map((a) => a.uri);
  } catch {
    return [];
  }
}
