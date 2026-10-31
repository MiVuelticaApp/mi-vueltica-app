import type { Filters } from '@/domain/types';
import { formatCRC } from '@/i18n/format';
import { t } from '@/i18n/es-CR';

/** "para estudiantes" / "gratis" / "de hasta ₡2.500": describes the active filter in the results card. */
export function describeFilters(f: Filters): string | null {
  if (f.students && !f.seniors) return t.map.forStudents;
  if (f.seniors && !f.students) return t.map.forSeniors;
  if (f.families) return t.map.forFamilies;
  if (f.maxPrice === 'gratis') return t.map.forFree;
  if (f.maxPrice === 'hasta2500') return t.map.upTo(formatCRC(2500));
  if (f.wheelchair) return t.map.forAccessible;
  if (f.students && f.seniors) return t.map.forStudents;
  return null;
}
