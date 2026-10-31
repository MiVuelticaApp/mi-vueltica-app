import { Image } from 'expo-image';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import type { Vueltica } from '@/domain/types';

export function placeholderFor(v: Pick<Vueltica, 'type' | 'category'>): { icon: IconName; bg: 'place' | 'event' | 'primary' } {
  if (v.type === 'evento') return { icon: 'ticket', bg: 'event' };
  if (/museo|cultura|galer|biblio/i.test(v.category)) return { icon: 'image', bg: 'primary' };
  return { icon: 'bench', bg: 'place' };
}

/** Photo, or the colored placeholder tile with the type glyph (Figma "Photo placeholder"). */
export function PhotoTile({ uri, item, size, radius = 12, testID }: { uri?: string; item: Pick<Vueltica, 'type' | 'category'>; size: number | `${number}%`; radius?: number; testID?: string }) {
  const ph = placeholderFor(item);
  const real = uri && !uri.startsWith('ph:');
  const dim = typeof size === 'number' ? { width: size, height: size } : { width: size, aspectRatio: 1 };
  const bg = ph.bg === 'primary' ? '#1b3c8c' : ph.bg === 'event' ? '#b8321a' : '#0b6b3a';
  return (
    <View testID={testID} accessible accessibilityLabel={real ? undefined : 'Foto de ejemplo'} accessibilityRole="image" style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, dim]}>
      {real ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name={ph.icon} size={typeof size === 'number' ? Math.max(24, size * 0.36) : 56} color="#ffffff" />}
    </View>
  );
}
