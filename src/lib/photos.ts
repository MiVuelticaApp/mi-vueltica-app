import * as ImagePicker from 'expo-image-picker';

/** Opens the system photo picker and returns the selected image URIs (max `limit`). */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.status !== 'undetermined') return [];
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 0.7 });
    if (res.canceled) return [];
    return res.assets.slice(0, limit).map((a) => a.uri);
  } catch {
    return [];
  }
}
