import { useMarkUseful } from '@/data/queries';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { toast } from '@/components/ui/Toast';
import { t } from '@/i18n/es-CR';
import type { Review } from '@/domain/types';

/** "Útil" on a review (needs sign-in) and the review "Reportar" flag. */
export function useReviewActions(next: string) {
  const mark = useMarkUseful();
  const requireAuth = useRequireAuth();
  return {
    useful: (r: Review) => requireAuth('useful', { kind: 'useful', reviewId: r.id }, { next }, () => mark.mutate(r.id)),
    report: () => toast(t.report.sent),
  };
}
