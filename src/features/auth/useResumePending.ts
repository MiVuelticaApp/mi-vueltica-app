import { router } from 'expo-router';
import { useEffect } from 'react';
import { api } from '@/data';
import { useInvalidateAll } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';
import { toast } from '@/components/ui/Toast';

/** After a successful login, performs the action that triggered the gate (save, review, ...). */
export function useResumePending() {
  const user = useSession((s) => s.user);
  const pending = useSession((s) => s.pending);
  const invalidate = useInvalidateAll();
  useEffect(() => {
    if (!user || !pending) return;
    // 'review' is resumed by the login screen itself (it must open after navigating back to `next`).
    if (pending.kind === 'review') return;
    const p = pending;
    useSession.getState().setPending(null);
    void (async () => {
      try {
        if (p.kind === 'save') {
          await api.saveVueltica(p.id);
          await invalidate();
          toast(t.saved.savedToast);
        } else if (p.kind === 'useful') {
          await api.markUseful(p.reviewId);
          await invalidate();
        } else if (p.kind === 'moderate') {
          router.push('/moderacion');
        }
        // 'contribute' resumes by itself: the Aportar tab shows the form once signed in.
      } catch {
        /* the user can retry the action */
      }
    })();
  }, [user, pending, invalidate]);
}
