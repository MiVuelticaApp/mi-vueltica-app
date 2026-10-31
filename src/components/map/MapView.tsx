import { Image, type ImageRef } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { boundsAround, zoomForLatDelta } from '@/domain/geo';
import { useAppTheme } from '@/theme/useAppTheme';
import ImageMap from './ImageMap';
import { PIN_ANCHOR } from './Markers';
import { PIN_SIZE, pinSource } from './pins';
import type { MapViewProps } from './types';
import { useClusters } from './useClusters';

/** `expo-maps` is a native module: it is missing in Expo Go / some dev clients. Fall back to the image map then. */
let Maps: typeof import('expo-maps') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Maps = require('expo-maps');
  void Maps?.AppleMaps;
} catch {
  Maps = null;
}

/** Cluster bubbles are rendered as SVG data URIs (the number is baked into the icon). */
function clusterSvg(count: number, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><circle cx="23" cy="23" r="20" fill="${fill}" stroke="#fff" stroke-width="3"/><text x="23" y="29" font-family="sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${count}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function NativeMap(props: MapViewProps) {
  const { items, pending, selectedId, center, showUser, recenterToken, onSelect, onSelectPending, onMapPress, dropPin } = props;
  const { dark, c } = useAppTheme();
  const ref = useRef<{ setCameraPosition: (p: { coordinates: { latitude: number; longitude: number }; zoom?: number }) => Promise<void> } | null>(null);
  const [cam, setCam] = useState({ zoom: 13, lat: center.lat, lng: center.lng, latDelta: 0.1 });
  const [clusterIcons, setClusterIcons] = useState<Record<number, ImageRef>>({});

  const bounds = useMemo(() => {
    const span = Math.max(0.01, cam.latDelta);
    return { north: cam.lat + span / 2, south: cam.lat - span / 2, east: cam.lng + span, west: cam.lng - span };
  }, [cam]);
  void boundsAround;
  const nodes = useClusters(items, pending, bounds, cam.zoom);

  useEffect(() => {
    void ref.current?.setCameraPosition({ coordinates: { latitude: center.lat, longitude: center.lng }, zoom: 13 });
  }, [recenterToken, center.lat, center.lng]);

  // Pin images (14 variants), loaded once.
  const [icons, setIcons] = useState<Record<string, ImageRef>>({});
  useEffect(() => {
    let alive = true;
    const keys: [string, 'lugar' | 'evento' | 'pendiente', 'gratis' | 'hasta2500' | 'hasta5000', boolean][] = [];
    for (const k of ['lugar', 'evento'] as const) for (const tier of ['gratis', 'hasta2500', 'hasta5000'] as const) for (const sel of [false, true]) keys.push([`${k}.${tier}.${sel}`, k, tier, sel]);
    keys.push(['pendiente.gratis.false', 'pendiente', 'gratis', false], ['pendiente.gratis.true', 'pendiente', 'gratis', true]);
    void Promise.all(
      keys.map(async ([key, kind, tier, sel]) => {
        const size = sel ? PIN_SIZE.selected : PIN_SIZE.normal;
        return [key, await Image.loadAsync(pinSource(kind, tier, sel), { maxWidth: size.w, maxHeight: size.h })] as const;
      }),
    ).then((entries) => alive && setIcons(Object.fromEntries(entries)));
    return () => {
      alive = false;
    };
  }, []);

  const wanted = useMemo(() => Array.from(new Set(nodes.filter((n) => n.kind === 'cluster').map((n) => (n.kind === 'cluster' ? n.count : 0)))), [nodes]);
  useEffect(() => {
    for (const n of wanted) {
      if (clusterIcons[n]) continue;
      Image.loadAsync(clusterSvg(n, c.primary), { maxWidth: 46, maxHeight: 46 })
        .then((r) => setClusterIcons((prev) => ({ ...prev, [n]: r })))
        .catch(() => {});
    }
  }, [wanted, clusterIcons, c.primary]);

  const dropMarker = dropPin ? [{ id: 'drop', coordinates: { latitude: dropPin.lat, longitude: dropPin.lng }, title: 'Ubicación elegida', icon: icons[`${dropPin.type}.gratis.true`], anchor: PIN_ANCHOR }] : [];
  const markers = [...nodes
    .map((n) => {
      if (n.kind === 'cluster') {
        const icon = clusterIcons[n.count];
        return icon ? { id: n.id, coordinates: { latitude: n.lat, longitude: n.lng }, title: String(n.count), icon, anchor: { x: 0.5, y: 0.5 } } : null;
      }
      const sel = n.kind === 'pin' && selectedId === n.id;
      const key = n.kind === 'pending' ? `pendiente.gratis.${sel}` : `${n.item.type}.${n.item.priceTier}.${sel}`;
      const icon = icons[key];
      return icon ? { id: n.kind === 'pending' ? `pending:${n.id}` : n.id, coordinates: { latitude: n.lat, longitude: n.lng }, title: n.item.name, icon, anchor: PIN_ANCHOR } : null;
    })
    .filter((m): m is NonNullable<typeof m> => !!m), ...dropMarker.filter((m) => !!m.icon)];

  const onMarkerClick = (m: { id?: string }) => {
    const id = m.id ?? '';
    if (id.startsWith('c-')) {
      const node = nodes.find((n) => n.id === id);
      if (node?.kind === 'cluster') void ref.current?.setCameraPosition({ coordinates: { latitude: node.lat, longitude: node.lng }, zoom: node.expansionZoom });
    } else if (id.startsWith('pending:')) {
      const v = pending.find((p) => p.id === id.slice(8));
      if (v) onSelectPending(v);
    } else onSelect(id);
  };
  const onCameraMove = (e: { zoom: number; coordinates: { latitude?: number; longitude?: number }; latitudeDelta: number }) =>
    setCam({ zoom: e.zoom ?? zoomForLatDelta(e.latitudeDelta), lat: e.coordinates.latitude ?? cam.lat, lng: e.coordinates.longitude ?? cam.lng, latDelta: e.latitudeDelta });

  if (!Maps) return <ImageMap {...props} />;
  const camera = { coordinates: { latitude: center.lat, longitude: center.lng }, zoom: 13 };
  if (Platform.OS === 'ios') {
    const { AppleMaps } = Maps;
    // iOS pin taps need iOS 18+; annotations carry the icon on Apple Maps.
    const annotations = markers.map((m) => ({ id: m.id, coordinates: m.coordinates, icon: m.icon, anchor: m.anchor, text: undefined }));
    return (
      <View testID="map.view" style={{ flex: 1 }}>
        <AppleMaps.View
          ref={ref as never}
          style={{ flex: 1 }}
          cameraPosition={camera}
          colorScheme={dark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          properties={{ isMyLocationEnabled: showUser, mapType: AppleMaps.MapType.STANDARD, selectionEnabled: true }}
          uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false }}
          annotations={annotations}
          onAnnotationClick={onMarkerClick}
          onMarkerClick={onMarkerClick}
          onCameraMove={onCameraMove as never}
          onMapClick={(e: { coordinates: { latitude?: number; longitude?: number } }) => onMapPress?.(e.coordinates.latitude ?? 0, e.coordinates.longitude ?? 0)}
        />
      </View>
    );
  }
  const { GoogleMaps } = Maps;
  return (
    <View testID="map.view" style={{ flex: 1 }}>
      <GoogleMaps.View
        ref={ref as never}
        style={{ flex: 1 }}
        cameraPosition={camera}
        colorScheme={dark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
        properties={{ isMyLocationEnabled: showUser, mapType: GoogleMaps.MapType.NORMAL }}
        uiSettings={{ zoomControlsEnabled: false, myLocationButtonEnabled: false, compassEnabled: false, mapToolbarEnabled: false }}
        markers={markers}
        onMarkerClick={onMarkerClick}
        onMapClick={(e: { coordinates: { latitude?: number; longitude?: number } }) => onMapPress?.(e.coordinates.latitude ?? 0, e.coordinates.longitude ?? 0)}
        onCameraMove={onCameraMove as never}
      />
    </View>
  );
}

export default function MapView(props: MapViewProps) {
  return <NativeMap {...props} />;
}
