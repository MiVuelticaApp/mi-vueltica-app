import { CONTACT_EMAIL } from './legal';

export const SOCIAL = {
  handle: '@mi_vueltica',
  instagram: 'https://instagram.com/mi_vueltica',
  tiktok: 'https://www.tiktok.com/@mi_vueltica',
  email: `mailto:${CONTACT_EMAIL}`,
  /** Shown in the row: the full address does not fit next to "Correo". */
  emailLabel: CONTACT_EMAIL.split('@')[0],
} as const;
