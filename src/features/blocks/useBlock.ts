import { confirmDialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { NotFoundError } from '@/data/api';
import { useBlockAuthor } from '@/data/queries';
import type { VuelticaView } from '@/domain/types';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { t } from '@/i18n/es-CR';
import { errorMessage } from '@/lib/errors';

/** Curated plans (no person behind them), anonymised ones (deleted accounts) and the caller's own cannot be blocked. */
export const hasPersonAuthor = (v: Pick<VuelticaView, 'blockable'>) => !!v.blockable;

/** "Bloquear a esta persona": sign-in gate, confirmation, then the author's content disappears (guideline 1.2). */
export function useBlock(next: string) {
  const block = useBlockAuthor();
  const requireAuth = useRequireAuth();
  return (target: { kind: 'vueltica' | 'review'; id: string }, name: string, onDone?: () => void) =>
    requireAuth('block', null, { next }, async () => {
      const ok = await confirmDialog({ title: t.blocks.confirmTitle(name), message: t.blocks.confirmBody, confirmLabel: t.blocks.confirm, destructive: true });
      if (!ok) return;
      block.mutate(target, {
        onSuccess: () => {
          toast(t.blocks.done(name));
          onDone?.();
        },
        onError: (e) => toast(e instanceof NotFoundError ? t.blocks.noAuthor : errorMessage(e)),
      });
    });
}
