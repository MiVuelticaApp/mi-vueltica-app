import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { t } from '@/i18n/es-CR';
import { IconButton } from '@/components/ui/IconButton';
import { DEFAULT_LOCATION } from '@/domain/geo';
import { useAppTheme } from '@/theme/useAppTheme';
import { ClusterMarker, PinMarker, UserDot } from './Markers';
import { MAP_IMAGES } from './pins';
import type { MapViewProps } from './types';
import { useClusters } from './useClusters';

const KM_LAT = 111.32;
const KM_PER_PX_BASE = 0.02;
const MIN_KPP = 0.0025;
const MAX_KPP = 0.08;

/**
 * Fallback map: the "Map Base" art from Figma with an equirectangular projection around the base center.
 * Used on web (test target) and when the native maps module is unavailable (Expo Go). Same supercluster and pin PNGs.
 */
export default function ImageMap({ items, pending, selectedId, center, showUser, recenterToken, onSelect, onSelectPending, onMapPress, dropPin }: MapViewProps) {
  const { dark } = useAppTheme();
  const [size, setSize] = useState({ w: 402, h: 874 });
  const [base] = useState(() => (center.lat ? center : DEFAULT_LOCATION));
  const [view, setView] = useState({ lat: center.lat, lng: center.lng, kpp: KM_PER_PX_BASE });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const kmLng = KM_LAT * Math.cos((view.lat * Math.PI) / 180);

  // Re-center when the location changes or the locate button is pressed (adjust state during render).
  const [seen, setSeen] = useState({ lat: center.lat, lng: center.lng, token: recenterToken });
  if (seen.lat !== center.lat || seen.lng !== center.lng || seen.token !== recenterToken) {
    setSeen({ lat: center.lat, lng: center.lng, token: recenterToken });
    setView((v) => ({ ...v, lat: center.lat, lng: center.lng }));
  }

  const pan = useRef({ lat: 0, lng: 0 });
  /* eslint-disable react-hooks/refs -- refs are only read inside the gesture handlers, never during render */
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          pan.current = { lat: viewRef.current.lat, lng: viewRef.current.lng };
        },
        onPanResponderMove: (_, g) => {
          const v = viewRef.current;
          const kLng = KM_LAT * Math.cos((v.lat * Math.PI) / 180);
          setView({ ...v, lng: pan.current.lng - (g.dx * v.kpp) / kLng, lat: pan.current.lat + (g.dy * v.kpp) / KM_LAT });
        },
      }),
    [],
  );
  /* eslint-enable react-hooks/refs */

  const toXY = (lat: number, lng: number) => ({ x: size.w / 2 + ((lng - view.lng) * kmLng) / view.kpp, y: size.h / 2 - ((lat - view.lat) * KM_LAT) / view.kpp });
  const bounds = useMemo(() => {
    const halfLat = (size.h / 2) * view.kpp / KM_LAT;
    const halfLng = (size.w / 2) * view.kpp / kmLng;
    return { north: view.lat + halfLat, south: view.lat - halfLat, east: view.lng + halfLng, west: view.lng - halfLng };
  }, [size, view, kmLng]);
  const zoom = Math.max(0, Math.log2((156543 * Math.cos((view.lat * Math.PI) / 180)) / (view.kpp * 1000)));
  const nodes = useClusters(items, pending, bounds, zoom);

  const s = KM_PER_PX_BASE / view.kpp;
  const bx = size.w / 2 + ((base.lng - view.lng) * kmLng) / view.kpp;
  const by = size.h / 2 - ((base.lat - view.lat) * KM_LAT) / view.kpp;
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const zoomBy = (f: number, around?: { lat: number; lng: number }) => setView((v) => ({ lat: around?.lat ?? v.lat, lng: around?.lng ?? v.lng, kpp: Math.min(MAX_KPP, Math.max(MIN_KPP, v.kpp * f)) }));
  const user = toXY(center.lat, center.lng);

  return (
    <View testID="map.view" onLayout={onLayout} style={{ flex: 1, overflow: 'hidden', backgroundColor: dark ? '#161b24' : '#efefea' }} {...responder.panHandlers}>
      <Image
        source={dark ? MAP_IMAGES.dark : MAP_IMAGES.light}
        accessible={false}
        style={{ position: 'absolute', left: bx - (size.w / 2) * s, top: by - (size.h / 2) * s, width: size.w * s, height: size.h * s }}
        contentFit="cover"
      />
      {onMapPress ? (
        <Pressable
          testID="map.surface"
          accessibilityLabel={t.map.mapA11y}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={(e) => {
            // react-native-web press events have no locationX/Y: derive the point from client coordinates.
            const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; clientX?: number; clientY?: number; pageX?: number; pageY?: number };
            let x = ne.locationX;
            let y = ne.locationY;
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              const rect = (e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; top: number } }).getBoundingClientRect?.();
              x = (ne.clientX ?? ne.pageX ?? NaN) - (rect?.left ?? 0);
              y = (ne.clientY ?? ne.pageY ?? NaN) - (rect?.top ?? 0);
            }
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            onMapPress(view.lat - ((y! - size.h / 2) * view.kpp) / KM_LAT, view.lng + ((x! - size.w / 2) * view.kpp) / kmLng);
          }}
        />
      ) : null}
      {dropPin ? (() => {
        const p = toXY(dropPin.lat, dropPin.lng);
        const pseudo = { id: 'drop', type: dropPin.type, priceTier: 'gratis', name: t.map.pickedLocation } as never;
        return <PinMarker item={pseudo} selected x={p.x} y={p.y} onPress={() => {}} />;
      })() : null}
      {showUser ? <UserDot x={user.x} y={user.y} /> : null}
      {nodes.map((n) => {
        const { x, y } = toXY(n.lat, n.lng);
        if (x < -60 || y < -80 || x > size.w + 60 || y > size.h + 60) return null;
        if (n.kind === 'cluster') return <ClusterMarker key={n.id} id={n.id} count={n.count} x={x} y={y} onPress={() => zoomBy(0.5, { lat: n.lat, lng: n.lng })} />;
        if (n.kind === 'pending') return <PinMarker key={`p-${n.id}`} item={n.item} pending selected={false} x={x} y={y} onPress={() => onSelectPending(n.item)} />;
        return <PinMarker key={n.id} item={n.item} selected={selectedId === n.id} x={x} y={y} onPress={() => onSelect(n.id)} />;
      })}
      <View style={{ position: 'absolute', right: 16, top: 240, gap: 8 }}>
        <IconButton testID="map.zoomIn" icon="plus" label={t.map.zoomIn} onPress={() => zoomBy(0.6)} />
        <IconButton testID="map.zoomOut" icon="minus" label={t.map.zoomOut} onPress={() => zoomBy(1 / 0.6)} />
      </View>
      <View testID="map.zoomLevel" accessibilityLabel={`zoom ${Math.round(zoom)}`} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
    </View>
  );
}
