import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';
import { t } from '@/i18n/es-CR';
import { toast } from '@/components/ui/Toast';

export const vuelticaLink = (id: string) => Linking.createURL(`/vueltica/${id}`);

/** Native share sheet; on web (no Web Share API in desktop browsers / tests) copies the link. */
export async function shareVueltica(id: string, name: string) {
  const url = vuelticaLink(id);
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !(navigator as Navigator & { share?: unknown }).share) {
      await Clipboard.setStringAsync(url);
      toast(t.detail.copied);
      return;
    }
    await Share.share({ message: t.detail.shareMessage(name, url), url });
  } catch {
    await Clipboard.setStringAsync(url).catch(() => {});
    toast(t.detail.copied);
  }
}
