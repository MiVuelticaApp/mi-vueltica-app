import type { Level } from '@/domain/types';

/** Placeholder thresholds for the PDF's open question 1 (see docs/IMPLEMENTATION_NOTES.md). */
export const LEVELS: Level[] = [
  { number: 1, name: 'Primeras vueltas', threshold: 0, perk: 'Tus vuelticas necesitan 5 votos' },
  { number: 2, name: 'En ruta', threshold: 50, perk: 'Podés verificar precios' },
  { number: 3, name: 'De confianza', threshold: 120, perk: 'Tus vuelticas necesitan 3 votos y podés moderar' },
  { number: 4, name: 'Guía local', threshold: 200, perk: 'Tus verificaciones cuentan doble' },
  { number: 5, name: 'Leyenda tica', threshold: 400, perk: 'Ayudás a moderar vuelticas' },
];

export const POINTS = {
  published: 10,
  verified: 2,
  reviewUseful: 1,
  moderationVote: 1,
  rejected: -10,
  reported: -5,
  minorityModerator: -2,
} as const;
