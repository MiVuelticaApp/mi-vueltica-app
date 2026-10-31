import type { LatLng, VuelticaView } from '@/domain/types';

export type PendingView = VuelticaView & { mine: boolean };

export interface MapViewProps {
  items: VuelticaView[];
  pending: PendingView[];
  selectedId: string | null;
  /** Where to center (user location or province center). */
  center: LatLng;
  /** Show the blue "you are here" dot. */
  showUser: boolean;
  /** Bumped to re-center the camera (locate button). */
  recenterToken: number;
  onSelect: (id: string) => void;
  onSelectPending: (v: PendingView) => void;
  /** When the active chip/filter changes the camera should refit on the items. */
  offline?: boolean;
}

export type MapNode =
  | { kind: 'pin'; id: string; lat: number; lng: number; item: VuelticaView }
  | { kind: 'pending'; id: string; lat: number; lng: number; item: PendingView }
  | { kind: 'cluster'; id: string; lat: number; lng: number; count: number; expansionZoom: number };
