import { Image } from 'expo-image';
import { View } from 'react-native';
import { useAppTheme } from '@/theme/useAppTheme';
import { MAP_IMAGES, PIN_SIZE, pinSource } from './pins';

/** Decorative map strip with sample pins (Bienvenida / Login). */
export function MapPreview({ height, withUser, pins }: { height: number; withUser?: boolean; pins: { x: number; y: number; kind: 'lugar' | 'evento' }[] }) {
  const { dark } = useAppTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, borderRadius: 24, overflow: 'hidden', backgroundColor: dark ? '#161b24' : '#efefea' }}>
      <Image source={dark ? MAP_IMAGES.dark : MAP_IMAGES.light} style={{ position: 'absolute', top: -height * 0.9, left: 0, right: 0, height: height * 5 }} contentFit="cover" contentPosition="center" />
      {pins.map((p, i) => (
        <Image key={i} source={pinSource(p.kind, 'gratis', false)} style={{ position: 'absolute', left: `${p.x}%`, top: p.y, width: PIN_SIZE.normal.w * 0.8, height: PIN_SIZE.normal.h * 0.8, marginLeft: -20 }} contentFit="contain" />
      ))}
      {withUser ? <View style={{ position: 'absolute', left: '52%', top: height * 0.62, width: 44, height: 44, borderRadius: 22, backgroundColor: '#2f7bff33', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#2f7bff', borderWidth: 2, borderColor: '#fff' }} /></View> : null}
    </View>
  );
}
