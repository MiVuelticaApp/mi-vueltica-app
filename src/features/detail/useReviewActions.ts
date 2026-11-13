import { router } from 'expo-router';
import { confirmDialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useDeleteReview, useMarkUseful } from '@/data/queries';
import type { Review } from '@/domain/types';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { t } from '@/i18n/es-CR';
import { errorMessage } from '@/lib/errors';
import { useSession } from '@/state/session';

/** "Útil" on a review (needs sign-in), the review "Reportar" flag, and Editar / Eliminar on the caller's own review. */
export function useReviewActions(next: string) {
  const mark = useMarkUseful();
  const del = useDeleteReview();
  const requireAuth = useRequireAuth();
  const userId = useSession((s) => s.user?.id ?? null);
  return {
    isMine: (r: Review) => !!userId && r.authorId === userId,
    useful: (r: Review) => requireAuth('useful', { kind: 'useful', reviewId: r.id }, { next }, () => mark.mutate(r.id, { onError: (e) => toast(errorMessage(e)) })),
    report: () => toast(t.report.sent),
    edit: (r: Review) => router.push({ pathname: '/vueltica/[id]/escribir-resena', params: { id: r.vuelticaId, reviewId: r.id } }),
    remove: async (r: Review) => {
      const ok = await confirmDialog({ title: t.reviews.deleteTitle, message: t.reviews.deleteBody, confirmLabel: t.reviews.delete, destructive: true });
      if (ok) del.mutate(r.id, { onSuccess: () => toast(t.reviews.deleted), onError: (e) => toast(errorMessage(e)) });
    },
  };
}
