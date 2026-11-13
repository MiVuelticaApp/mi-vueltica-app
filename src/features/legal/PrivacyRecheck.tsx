import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { PRIVACY_VERSION } from '@/config/legal';
import { api } from '@/data';
import { useSignOut } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { errorMessage } from '@/lib/errors';
import { useSession } from '@/state/session';
import { PrivacyNotice } from './PrivacyNotice';

/**
 * Signed-in accounts whose consent is missing or older than `PRIVACY_VERSION` are asked once (`/me` says so).
 * Declining signs out: using an account requires the consent, and revoking it means deleting the account.
 * An API without consent fields leaves `privacyVersion` undefined and nobody is asked.
 */
export function PrivacyRecheck() {
  const user = useSession((s) => s.user);
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  const needs = !!user && user.privacyVersion !== undefined && user.privacyVersion !== PRIVACY_VERSION;
  if (!needs) return null;
  const accept = async () => {
    setBusy(true);
    try {
      useSession.getState().setUser(await api.acceptPrivacy(PRIVACY_VERSION));
      useSession.getState().setPrivacyAccepted(PRIVACY_VERSION);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return <PrivacyNotice visible updated={user.privacyVersion !== null} busy={busy} onAccept={() => void accept()} onDecline={() => signOut.mutate(undefined, { onSuccess: () => toast(t.privacy.signedOut) })} />;
}
