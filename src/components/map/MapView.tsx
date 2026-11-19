import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import ImageMap from './ImageMap';
import { PIN_ANCHOR } from './Markers';
import { PIN_SIZE, pinSource } from './pins';
import type { MapViewProps } from './types';

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

/** Pin art is exported @3x, so it is drawn at a third of its pixel size. */
const PIN_IMAGES: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const kind of ['lugar', 'evento'] as const) for (const tier of ['gratis', 'hasta2500', 'hasta5000'] as const) for (const sel of [false, true]) out[`${kind}.${tier}.${sel}`] = pinSource(kind, tier, sel);
  out['pendiente.false'] = pinSource('pendiente', 'gratis', false);
  return out;
})();
/** The tip of the drop sits at 85% of the image height; the layer anchors on the bottom edge, so shift the icon down by the rest. */
const OFFSET_NORMAL = Math.round((1 - PIN_ANCHOR.y) * PIN_SIZE.normal.h * 3);
const OFFSET_SELECTED = Math.round((1 - PIN_ANCHOR.y) * PIN_SIZE.selected.h * 3);

function NativeMap(props: MapViewProps) {
  const { items, pending, selectedId, center, showUser, recenterToken, onSelect, onSelectPending, onMapPress, onBoundsChange, dropPin } = props;
  const { dark } = useAppTheme();
  const M = Mapbox!;
  const camera = useRef<{ setCamera: (c: { centerCoordinate?: number[]; zoomLevel?: number; animationDuration?: number }) => void } | null>(null);
  const [cam, setCam] = useState({ zoom: START_ZOOM, bounds: { north: center.lat + 0.05, south: center.lat - 0.05, east: center.lng + 0.05, west: center.lng - 0.05 } });
  // Every plan keeps its own pin at every zoom level (no clustering). The pins are ONE map layer fed by GeoJSON, not a native
  // view each: hundreds of views exhausted the phone's memory as soon as the list refreshed.
  const pins = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        ...items
          .filter((v) => !v.noLocation)
          .map((v) => {
            const sel = selectedId === v.id;
            return { type: 'Feature' as const, id: v.id, geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] }, properties: { id: v.id, icon: `${v.type}.${v.priceTier}.${sel}`, z: sel ? 2 : 0 } };
          }),
        ...pending.map((v) => ({ type: 'Feature' as const, id: `pending:${v.id}`, geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] }, properties: { id: `pending:${v.id}`, icon: 'pendiente.false', z: 1 } })),
      ],
    }),
    [items, pending, selectedId],
  );
  const onPinPress = useCallback(
    (e: { features: { properties?: { id?: string } | null }[] }) => {
      const id = e.features[0]?.properties?.id;
      if (!id) return;
      if (id.startsWith('pending:')) {
        const v = pending.find((p) => p.id === id.slice(8));
        if (v) onSelectPending(v);
      } else onSelect(id);
    },
    [pending, onSelect, onSelectPending],
  );

  // Report the visible area once the camera settles. The screen passes a stable callback.
  useEffect(() => {
    if (!onBoundsChange) return;
    const timer = setTimeout(() => onBoundsChange(cam.bounds), 400);
    return () => clearTimeout(timer);
  }, [cam.bounds, onBoundsChange]);

  // Skip the first run: `defaultSettings` already sets the initial camera, and the native map isn't ready yet on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    camera.current?.setCamera({ centerCoordinate: [center.lng, center.lat], zoomLevel: START_ZOOM, animationDuration: 400 });
  }, [recenterToken, center.lat, center.lng]);

  // Only store a genuinely new area: a fresh object on every idle would re-render all the pins, and re-laying them out can
  // make the map go idle again (an endless loop that ends with the OS killing the app for memory).
  const onIdle = useCallback((s: { properties: { zoom: number; bounds: { ne: number[]; sw: number[] } } }) => {
    const { ne, sw } = s.properties.bounds;
    const next = { north: ne[1], south: sw[1], east: ne[0], west: sw[0] };
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-5;
    setCam((prev) => (close(prev.bounds.north, next.north) && close(prev.bounds.south, next.south) && close(prev.bounds.east, next.east) && close(prev.bounds.west, next.west) ? prev : { zoom: s.properties.zoom, bounds: next }));
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
        <M.Images images={PIN_IMAGES} />
        <M.ShapeSource id="pins" shape={pins} hitbox={{ width: 44, height: 56 }} onPress={onPinPress}>
          <M.SymbolLayer
            id="pins-layer"
            style={{
              iconImage: ['get', 'icon'],
              iconSize: 1 / 3,
              iconAnchor: 'bottom',
              iconOffset: ['case', ['==', ['get', 'z'], 2], ['literal', [0, OFFSET_SELECTED]], ['literal', [0, OFFSET_NORMAL]]],
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              symbolSortKey: ['get', 'z'],
            }}
          />
        </M.ShapeSource>
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
