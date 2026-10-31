import { formatAgo } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useIsOffline, useNetwork } from '@/state/network';
import { Banner } from './Banner';

/** "Sin conexión. Mostrando lo guardado (hace N min)." shown as soon as the device or the dev flag is offline. */
export function OfflineBanner({ onRetry, testID = 'offline.banner' }: { onRetry?: () => void; testID?: string }) {
  const offline = useIsOffline();
  const since = useNetwork((s) => s.lastOnlineAt);
  if (!offline) return null;
  return <Banner testID={testID} tone="warning" icon="wifiOff" text={t.offline.banner(formatAgo(since, now()))} action={t.offline.retry} actionTestID="offline.retry" onAction={onRetry} />;
}
