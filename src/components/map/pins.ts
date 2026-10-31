import type { PriceTier, VuelticaType } from '@/domain/types';

export type PinKind = VuelticaType | 'pendiente';

/** Exported from Figma "Map Pin" (14 variants). Unselected 156×192 px (@3x), selected 192×239 px (@3x). */
const PINS: Record<string, number> = {
  'lugar.gratis': require('../../../assets/pins/place-gratis.png'),
  'lugar.hasta2500': require('../../../assets/pins/place-2500.png'),
  'lugar.hasta5000': require('../../../assets/pins/place-5000.png'),
  'lugar.gratis.sel': require('../../../assets/pins/place-gratis-sel.png'),
  'lugar.hasta2500.sel': require('../../../assets/pins/place-2500-sel.png'),
  'lugar.hasta5000.sel': require('../../../assets/pins/place-5000-sel.png'),
  'evento.gratis': require('../../../assets/pins/event-gratis.png'),
  'evento.hasta2500': require('../../../assets/pins/event-2500.png'),
  'evento.hasta5000': require('../../../assets/pins/event-5000.png'),
  'evento.gratis.sel': require('../../../assets/pins/event-gratis-sel.png'),
  'evento.hasta2500.sel': require('../../../assets/pins/event-2500-sel.png'),
  'evento.hasta5000.sel': require('../../../assets/pins/event-5000-sel.png'),
  pendiente: require('../../../assets/pins/pendiente.png'),
  'pendiente.sel': require('../../../assets/pins/pendiente-sel.png'),
};

export function pinSource(kind: PinKind, tier: PriceTier, selected: boolean): number {
  const key = kind === 'pendiente' ? 'pendiente' : `${kind}.${tier}`;
  return PINS[selected ? `${key}.sel` : key];
}

/** Rendered size in points (px / 3). */
export const PIN_SIZE = { normal: { w: 52, h: 64 }, selected: { w: 64, h: 80 } } as const;
export const MAP_IMAGES = {
  light: require('../../../assets/map/map-light.png') as number,
  dark: require('../../../assets/map/map-dark.png') as number,
};
