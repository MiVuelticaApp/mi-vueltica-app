import { router } from 'expo-router';
import { useCallback } from 'react';
import { useSession, type PendingAction } from '@/state/session';

export type GateReason = 'save' | 'contribute' | 'review' | 'moderate' | 'useful';

/**
 * Sign-in gate. Signed in → runs the action. Signed out → remembers it, opens Login (replacing the current
 * sheet, FR-1.3) and, after login, `useResumePending` runs it and `next` is restored.
 */
export function useRequireAuth() {
  const user = useSession((s) => s.user);
  return useCallback(
    (reason: GateReason, pending: PendingAction, opts: { next?: string; replace?: boolean }, run: () => void) => {
      if (user) {
        run();
        return true;
      }
      useSession.getState().setPending(pending);
      const href = { pathname: '/login' as const, params: { reason, ...(opts.next ? { next: opts.next } : null) } };
      if (opts.replace) router.replace(href);
      else router.push(href);
      return false;
    },
    [user],
  );
}
