import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { Bounds } from '@/domain/geo';
import type { VuelticaView } from '@/domain/types';
import type { MapNode, PendingView } from './types';

type Props = { id: string; pending: boolean };

/** Clusters the pins with supercluster (NFR-4/18). Pending pins are never clustered into published ones. */
export function useClusters(items: VuelticaView[], pending: PendingView[], bounds: Bounds, zoom: number): MapNode[] {
  const index = useMemo(() => {
    const sc = new Supercluster<Props>({ radius: 56, maxZoom: 16, minPoints: 2 });
    sc.load(
      items.map((v) => ({
        type: 'Feature' as const,
        properties: { id: v.id, pending: false },
        geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      })),
    );
    return sc;
  }, [items]);
  return useMemo(() => {
    const byId = new Map(items.map((v) => [v.id, v] as const));
    const out: MapNode[] = [];
    const feats = index.getClusters([bounds.west, bounds.south, bounds.east, bounds.north], Math.round(zoom));
    for (const f of feats) {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties as Props & { cluster?: boolean; cluster_id: number; point_count: number };
      if (p.cluster) {
        out.push({ kind: 'cluster', id: `c-${p.cluster_id}`, lat, lng, count: p.point_count, expansionZoom: Math.min(index.getClusterExpansionZoom(p.cluster_id), 18) });
      } else {
        const item = byId.get(p.id);
        if (item) out.push({ kind: 'pin', id: item.id, lat, lng, item });
      }
    }
    for (const v of pending) out.push({ kind: 'pending', id: v.id, lat: v.lat, lng: v.lng, item: v });
    return out;
  }, [index, items, pending, bounds.west, bounds.south, bounds.east, bounds.north, zoom]);
}
