import type { VuelticaView } from '@/domain/types';
import { formatCRC, formatEventShort } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';

/** Second line of a card: "Abierto hoy · 5:00 a.m. – 7:00 p.m." or "Vie 24 oct · 6:00 – 10:00 p.m.". */
export function scheduleLine(v: VuelticaView): string {
  if (v.type === 'evento') return formatEventShort(v.startAt, v.endAt);
  const h = v.openingHours ?? '';
  return h.replace(/^Todos los días/, 'Abierto hoy').replace(/^Siempre abierta$/, 'Abierto hoy · 24 horas');
}

/** "Parque · 1,2 km" */
export function typeLine(v: VuelticaView, distance: string): string {
  return `${v.type === 'evento' ? 'Evento' : v.category} · ${distance}`;
}

export function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const a = new Date(iso);
  const b = now();
  const sa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const sb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((sb - sa) / 86400000);
}

export function priceBadge(v: VuelticaView): string | null {
  if (v.priceTier === 'gratis') return null;
  const sundays = /Gratis los domingos/i.test(v.openingHours ?? '');
  return `${formatCRC(v.pricePerPerson)}${sundays ? ' · domingos gratis' : ''}`;
}

export const stale = (v: VuelticaView) => {
  const d = daysSince(v.lastVerifiedAt);
  return d === null || d > 30;
};
void t;
