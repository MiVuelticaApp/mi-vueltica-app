import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/useAppTheme';

export function SkeletonBlock({ w, h, r = 8 }: { w: DimensionValue; h: number; r?: number }) {
  const { c, reduceMotion } = useAppTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    o.value = withRepeat(withTiming(0.55, { duration: 800 }), -1, true);
  }, [reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.priceContainer }, style]} />;
}

/** Skeleton for the activity-card list (Figma 18 Cargando). */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  const { c } = useAppTheme();
  return (
    <View testID="list.skeleton" accessibilityLabel="Cargando planes" accessibilityRole="progressbar" style={{ gap: 12, paddingHorizontal: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 16, padding: 16, borderRadius: 16, backgroundColor: c.groupedSecondary, opacity: 1 - i * 0.12 }}>
          <SkeletonBlock w={76} h={76} r={12} />
          <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
            <SkeletonBlock w="90%" h={14} />
            <SkeletonBlock w="55%" h={12} />
            <SkeletonBlock w="75%" h={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
