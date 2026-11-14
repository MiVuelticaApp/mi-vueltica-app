import { router } from 'expo-router';
import { chooseDialog, confirmDialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { DuplicateReportError, ForbiddenError } from '@/data/api';
import { useDeleteReview, useMarkUseful, useReportReview } from '@/data/queries';
import type { Review, ReviewReportReason } from '@/domain/types';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useBlock } from '@/features/blocks/useBlock';
import { t } from '@/i18n/es-CR';
import { errorMessage } from '@/lib/errors';
import { useSession } from '@/state/session';

/** "Útil" on a review (needs sign-in), the review "Reportar" flag, and Editar / Eliminar on the caller's own review. */
export function useReviewActions(next: string) {
  const mark = useMarkUseful();
  const del = useDeleteReview();
  const reportReview = useReportReview();
  const requireAuth = useRequireAuth();
  const block = useBlock(next);
  const userId = useSession((s) => s.user?.id ?? null);
  return {
    isMine: (r: Review) => !!userId && r.authorId === userId,
    useful: (r: Review) => requireAuth('useful', { kind: 'useful', reviewId: r.id }, { next }, () => mark.mutate(r.id, { onError: (e) => toast(errorMessage(e)) })),
    report: (r: Review) =>
      requireAuth('report', null, { next }, async () => {
        const reasons: ReviewReportReason[] = ['inapropiado', 'spam', 'otro'];
        const reason = await chooseDialog({ title: t.reviews.reportTitle, testID: 'review.reportDialog', options: reasons.map((value) => ({ value, label: t.reviews.reportReasons[value] })) });
        if (!reason) return;
        reportReview.mutate(
          { reviewId: r.id, reason },
          {
            onSuccess: (res) => toast(res.hidden ? t.reviews.reportHidden : t.reviews.reportSent),
            onError: (e) => toast(e instanceof DuplicateReportError ? t.reviews.reportDupe : e instanceof ForbiddenError ? t.reviews.reportOwn : errorMessage(e)),
          },
        );
      }),
    block: (r: Review) => block({ kind: 'review', id: r.id }, r.authorName),
    edit: (r: Review) => router.push({ pathname: '/vueltica/[id]/escribir-resena', params: { id: r.vuelticaId, reviewId: r.id } }),
    remove: async (r: Review) => {
      const ok = await confirmDialog({ title: t.reviews.deleteTitle, message: t.reviews.deleteBody, confirmLabel: t.reviews.delete, destructive: true });
      if (ok) del.mutate(r.id, { onSuccess: () => toast(t.reviews.deleted), onError: (e) => toast(errorMessage(e)) });
    },
  };
}
