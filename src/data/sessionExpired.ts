import { toast } from '@/components/ui/Toast';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';

/**
 * The API answered 401 to an authenticated request (the client already dropped the token): sign the UI out and tell the
 * person why. Parallel requests each fire this, but only the first sees a user, so a burst shows a single toast.
 */
export function handleSessionExpired(clearLocalSession: () => Promise<void>): void {
  const { user, setUser } = useSession.getState();
  void clearLocalSession();
  setUser(null);
  if (user) toast(t.auth.sessionExpired);
}
