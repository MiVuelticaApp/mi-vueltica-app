import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Tap } from '@/components/ui/Tap';
import { t } from '@/i18n/es-CR';
import type { VuelticaView } from '@/domain/types';
import { useAppTheme } from '@/theme/useAppTheme';
import ImageMap from './ImageMap';
import { PIN_ANCHOR } from './Markers';
import { PIN_SIZE, pinSource } from './pins';
import type { MapViewProps, PendingView } from './types';

/**
 * Mapbox (`@rnmapbox/maps`) is a native module and needs a public token (EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN). Without either
 * (Expo Go, no token configured) fall back to the image map so the app still works.
 */
type MapboxModule = typeof import('@rnmapbox/maps').default;
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
let Mapbox: MapboxModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps');
  Mapbox = (mod.default ?? mod) as MapboxModule;
  if (TOKEN) void Mapbox.setAccessToken(TOKEN);
  else {
    console.warn('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is not set: using the image map.');
    Mapbox = null;
  }
} catch {
  Mapbox = null;
}

const STYLE_LIGHT = process.env.EXPO_PUBLIC_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/streets-v12';
const STYLE_DARK = process.env.EXPO_PUBLIC_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11';
const START_ZOOM = 12;

type PinNode = { kind: 'pin'; id: string; lat: number; lng: number; item: VuelticaView } | { kind: 'pending'; id: string; lat: number; lng: number; item: PendingView };

function NativeMap(props: MapViewProps) {
  const { items, pending, selectedId, center, showUser, recenterToken, onSelect, onSelectPending, onMapPress, onBoundsChange, dropPin } = props;
  const { dark } = useAppTheme();
  const M = Mapbox!;
  const camera = useRef<{ setCamera: (c: { centerCoordinate?: number[]; zoomLevel?: number; animationDuration?: number }) => void } | null>(null);
  const [cam, setCam] = useState({ zoom: START_ZOOM, bounds: { north: center.lat + 0.05, south: center.lat - 0.05, east: center.lng + 0.05, west: center.lng - 0.05 } });
  // Every plan keeps its own pin at every zoom level: no clustering (the image fallback map still clusters).
  const nodes = useMemo<PinNode[]>(
    () => [
      ...items.filter((v) => !v.noLocation).map((v) => ({ kind: 'pin' as const, id: v.id, lat: v.lat, lng: v.lng, item: v })),
      ...pending.map((v) => ({ kind: 'pending' as const, id: v.id, lat: v.lat, lng: v.lng, item: v })),
    ],
    [items, pending],
  );

  // Report the visible area once the camera settles. The screen passes a stable callback.
  useEffect(() => {
    if (!onBoundsChange) return;
    const timer = setTimeout(() => onBoundsChange(cam.bounds), 400);
    return () => clearTimeout(timer);
  }, [cam.bounds, onBoundsChange]);

  useEffect(() => {
    camera.current?.setCamera({ centerCoordinate: [center.lng, center.lat], zoomLevel: START_ZOOM, animationDuration: 400 });
  }, [recenterToken, center.lat, center.lng]);

  const onIdle = useCallback((s: { properties: { zoom: number; bounds: { ne: number[]; sw: number[] } } }) => {
    const { ne, sw } = s.properties.bounds;
    setCam({ zoom: s.properties.zoom, bounds: { north: ne[1], south: sw[1], east: ne[0], west: sw[0] } });
  }, []);

  const defaultSettings = useMemo(() => ({ centerCoordinate: [center.lng, center.lat], zoomLevel: START_ZOOM }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View testID="map.view" style={{ flex: 1 }}>
      <M.MapView
        style={{ flex: 1 }}
        styleURL={dark ? STYLE_DARK : STYLE_LIGHT}
        compassEnabled={false}
        scaleBarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        attributionEnabled
        logoEnabled
        localizeLabels={{ locale: 'es' }}
        onMapIdle={onIdle}
        onPress={(f: GeoJSON.Feature) => {
          if (f.geometry.type !== 'Point') return;
          const [lng, lat] = f.geometry.coordinates;
          onMapPress?.(lat, lng);
        }}
      >
        <M.Camera ref={camera as never} defaultSettings={defaultSettings} />
        {showUser ? <M.LocationPuck puckBearingEnabled={false} pulsing={{ isEnabled: true }} /> : null}
        {nodes.map((n) => {
          const isPending = n.kind === 'pending';
          const sel = !isPending && selectedId === n.id;
          const size = sel ? PIN_SIZE.selected : PIN_SIZE.normal;
          const label = isPending ? t.map.pinPending(n.item.name) : n.item.type === 'evento' ? t.map.pinEvent(n.item.name) : t.map.pinPlace(n.item.name);
          return (
            <M.MarkerView key={isPending ? `pending:${n.id}` : n.id} id={isPending ? `pending:${n.id}` : n.id} coordinate={[n.lng, n.lat]} anchor={PIN_ANCHOR} allowOverlap isSelected={sel}>
              <Tap
                testID={isPending ? `map.pin.pending.${n.id}` : `map.pin.${n.id}`}
                label={label}
                accessibilityState={{ selected: sel }}
                onPress={() => (n.kind === 'pending' ? onSelectPending(n.item) : onSelect(n.id))}
                style={{ width: size.w, height: size.h }}
              >
                <Image source={pinSource(isPending ? 'pendiente' : n.item.type, isPending ? 'gratis' : n.item.priceTier, sel)} style={{ width: size.w, height: size.h }} contentFit="contain" />
              </Tap>
            </M.MarkerView>
          );
        })}
        {dropPin ? (
          <M.MarkerView id="drop" coordinate={[dropPin.lng, dropPin.lat]} anchor={PIN_ANCHOR} allowOverlap>
            <Image source={pinSource(dropPin.type, 'gratis', true)} style={{ width: PIN_SIZE.selected.w, height: PIN_SIZE.selected.h }} contentFit="contain" accessibilityLabel={t.map.pickedLocation} />
          </M.MarkerView>
        ) : null}
      </M.MapView>
    </View>
  );
}

export default function MapView(props: MapViewProps) {
  return Mapbox ? <NativeMap {...props} /> : <ImageMap {...props} />;
}
