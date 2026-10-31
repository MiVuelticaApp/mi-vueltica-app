import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ColorTokens } from '@/theme/tokens';

type MCI = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Semantic icon names → Material Community Icons (cross-platform; native tab icons use SF Symbols / Material). */
const MAP = {
  map: 'map-outline', list: 'format-list-bulleted', add: 'plus-circle-outline', bookmark: 'bookmark-outline', bookmarkFilled: 'bookmark', person: 'account-outline',
  search: 'magnify', filter: 'tune-variant', locate: 'navigation-variant-outline', bench: 'table-furniture', ticket: 'ticket-confirmation-outline', check: 'check',
  close: 'close', chevronRight: 'chevron-right', chevronLeft: 'chevron-left', chevronDown: 'chevron-down', calendar: 'calendar-blank-outline', pin: 'map-marker-outline',
  share: 'export-variant', directions: 'directions', star: 'star', starOutline: 'star-outline', info: 'information-outline', clock: 'clock-outline', school: 'school-outline',
  medal: 'medal-outline', people: 'account-multiple-outline', wheelchair: 'wheelchair-accessibility', camera: 'camera-outline', flag: 'flag-outline', thumb: 'thumb-up-outline',
  mail: 'email-outline', apple: 'apple', google: 'google', settings: 'cog-outline', trash: 'trash-can-outline', download: 'download-outline', bell: 'bell-outline',
  image: 'image-outline', alert: 'alert-circle-outline', wifiOff: 'wifi-off', undo: 'undo', moon: 'weather-night', lock: 'lock-outline', plus: 'plus', minus: 'minus',
  heart: 'heart-outline', museum: 'bank-outline', park: 'tree-outline', arrowLeft: 'arrow-left', verified: 'check-decagram-outline', shield: 'shield-check-outline',
  checkCircle: 'check-circle', circleOutline: 'circle-outline', logout: 'logout', help: 'help-circle-outline', instagram: 'instagram', facebook: 'facebook', whatsapp: 'whatsapp', tiktok: 'music-note',
  sort: 'chevron-down', refresh: 'refresh', ticketFilled: 'ticket-confirmation', external: 'open-in-new', text: 'format-size', eye: 'eye-outline',
} as const satisfies Record<string, MCI>;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 20, color = 'onSurface' }: { name: IconName; size?: number; color?: keyof ColorTokens | (string & {}) }) {
  const { c } = useAppTheme();
  const resolved = (c as unknown as Record<string, string>)[color as string] ?? color;
  return <MaterialCommunityIcons name={MAP[name]} size={size} color={resolved as string} accessible={false} importantForAccessibility="no" />;
}
