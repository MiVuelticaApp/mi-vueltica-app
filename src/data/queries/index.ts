import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DEFAULT_LOCATION, PROVINCE_CENTERS } from '@/domain/geo';
import type { Filters, LatLng, SortKey, VuelticaView } from '@/domain/types';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { api } from '..';
import type {
  CreateReviewInput, CreateVuelticaInput, ReportInput, ReviewListParams, SimulateInput, VerifyInput, VuelticaDetail,
} from '../api';

/** Effective location: GPS if allowed, else the chosen province's center, else downtown San José. */
export function useAppLocation(): LatLng {
  const coords = useSession((s) => s.coords);
  const province = useSession((s) => s.province);
  return useMemo(() => {
    if (coords) return coords;
    if (province && PROVINCE_CENTERS[province]) return PROVINCE_CENTERS[province];
    return DEFAULT_LOCATION;
  }, [coords, province]);
}

const r2 = (n: number) => Math.round(n * 1000) / 1000;
const locKey = (l: LatLng) => [r2(l.lat), r2(l.lng)];

export const qk = {
  list: ['list'] as const,
  detail: (id: string) => ['detail', id] as const,
  saved: ['saved'] as const,
  recent: ['recent'] as const,
  mine: ['mine'] as const,
  reviews: (id: string) => ['reviews', id] as const,
  moderation: ['moderation'] as const,
  reputation: ['reputation'] as const,
  user: ['user'] as const,
};

export function useVuelticas(filters: Filters, sort: SortKey = 'cercanos', kind: 'list' | 'search' = 'list') {
  const location = useAppLocation();
  const maxPrice = useSettings((s) => s.settings.maxPrice);
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({
    queryKey: [...qk.list, kind, filters, sort, locKey(location), maxPrice, userId],
    queryFn: () => (kind === 'list' ? api.listVuelticas({ filters, location, sort, maxPrice }) : api.searchVuelticas({ filters, location, sort, maxPrice })),
    placeholderData: keepPreviousData,
    retry: (n, e) => !(e instanceof Error && e.name === 'OfflineError') && n < 1,
  });
}

/** Offline fallback: build a read-only detail from whatever list/saved/recent data is cached (FR-16.1). */
function detailFromCache(qc: QueryClient, id: string): VuelticaDetail | null {
  const found: VuelticaView[] = [];
  for (const [, data] of qc.getQueriesData<unknown>({ queryKey: [] })) {
    if (!data) continue;
    if (Array.isArray(data)) {
      for (const x of data as { id?: string; vuelticaView?: VuelticaView }[]) {
        if (x?.vuelticaView?.id === id) found.push(x.vuelticaView);
        else if (x?.id === id) found.push(x as VuelticaView);
      }
    } else if (typeof data === 'object' && Array.isArray((data as { items?: VuelticaView[] }).items)) {
      for (const x of (data as { items: VuelticaView[] }).items) if (x.id === id) found.push(x);
    }
  }
  const v = found[0];
  if (!v) return null;
  return {
    vuelticaView: v,
    saved: !!v.saved,
    rating: { avg: v.ratingAvg, count: v.ratingCount, distribution: [0, 0, 0, 0, 0] },
    reviewsPreview: [],
    verification: { lastVerifiedAt: v.lastVerifiedAt, count: v.verificationCount, myVerifiedToday: false },
    community: { authorName: v.authorName, verifiedBy: v.verificationCount, updatedAt: v.lastVerifiedAt ?? v.createdAt },
    mine: false,
  };
}

export function useVuelticaDetail(id: string) {
  const location = useAppLocation();
  const userId = useSession((s) => s.user?.id ?? null);
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...qk.detail(id), locKey(location), userId],
    queryFn: async () => {
      try {
        return await api.getVueltica(id, location);
      } catch (e) {
        if (e instanceof Error && e.name === 'OfflineError') {
          const cached = detailFromCache(qc, id);
          if (cached) return cached;
        }
        throw e;
      }
    },
    retry: false,
  });
}

export function useRecentlyViewed() {
  const location = useAppLocation();
  return useQuery({ queryKey: [...qk.recent, locKey(location)], queryFn: () => api.recentlyViewed(location), retry: false });
}

export function useSaved() {
  const location = useAppLocation();
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: [...qk.saved, locKey(location), userId], queryFn: () => api.listSaved(location), retry: false });
}

export function useMyVuelticas(enabled = true) {
  const location = useAppLocation();
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: [...qk.mine, locKey(location), userId], queryFn: () => api.myVuelticas(location), enabled: enabled && !!userId, retry: false });
}

export function useReviews(p: ReviewListParams) {
  return useQuery({ queryKey: [...qk.reviews(p.vuelticaId), p.sort, p.audience ?? null], queryFn: () => api.listReviews(p), placeholderData: keepPreviousData, retry: false });
}

export function useModerationQueue(enabled = true) {
  const location = useAppLocation();
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: [...qk.moderation, locKey(location), userId], queryFn: () => api.moderationQueue(location), enabled: enabled && !!userId, retry: false });
}

export function useModerationCount() {
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: [...qk.moderation, 'count', userId], queryFn: () => api.moderationCount(), enabled: !!userId, retry: false });
}

export function useReputation() {
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: [...qk.reputation, userId], queryFn: () => api.reputationSummary(), enabled: !!userId, retry: false });
}

/** Everything that depends on server state; used after any write. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: qk.list }), qc.invalidateQueries({ queryKey: ['detail'] }), qc.invalidateQueries({ queryKey: qk.saved }), qc.invalidateQueries({ queryKey: qk.mine }), qc.invalidateQueries({ queryKey: qk.moderation }), qc.invalidateQueries({ queryKey: qk.reputation }), qc.invalidateQueries({ queryKey: ['reviews'] }), qc.invalidateQueries({ queryKey: qk.recent })]);
}

function useRefreshUser() {
  const setUser = useSession((s) => s.setUser);
  return async () => setUser(await api.currentUser());
}

export function useToggleSave() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => (saved ? api.unsaveVueltica(id) : api.saveVueltica(id)),
    onSuccess: () => invalidate(),
  });
}

export function useVerify() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({ mutationFn: (i: VerifyInput) => api.verify(i), onSuccess: async () => { await refresh(); await invalidate(); } });
}

export function useReport() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (i: ReportInput) => api.report(i), onSuccess: () => invalidate() });
}

export function useCreateVueltica() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({ mutationFn: (i: CreateVuelticaInput) => api.createVueltica(i), onSuccess: async () => { await refresh(); await invalidate(); } });
}

export function useCreateReview() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({ mutationFn: (i: CreateReviewInput) => api.createReview(i), onSuccess: async () => { await refresh(); await invalidate(); } });
}

export function useMarkUseful() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.markUseful(id), onSuccess: () => invalidate() });
}

export function useVote() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({
    mutationFn: (i: { vuelticaId: string; choice: 'for' | 'against' }) => api.vote(i),
    onSuccess: async () => { await refresh(); await invalidate(); },
  });
}

export function useUndoVote() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({ mutationFn: (id: string) => api.undoVote(id), onSuccess: async () => { await refresh(); await invalidate(); } });
}

export function useWithdraw() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.withdrawVueltica(id), onSuccess: () => invalidate() });
}

export function useSimulate() {
  const invalidate = useInvalidateAll();
  const refresh = useRefreshUser();
  return useMutation({ mutationFn: (i: SimulateInput) => api.simulateCommunity(i), onSuccess: async () => { await refresh(); await invalidate(); } });
}

export function useSignIn() {
  const setUser = useSession((s) => s.setUser);
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (i: { provider: 'apple' | 'google' | 'email'; email?: string }) => api.signIn(i),
    onSuccess: async (u) => { setUser(u); await invalidate(); },
  });
}

export function useSignOut() {
  const setUser = useSession((s) => s.setUser);
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => api.signOut(), onSuccess: async () => { setUser(null); await invalidate(); } });
}

export function useDeleteAccount() {
  const setUser = useSession((s) => s.setUser);
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => api.deleteAccount(), onSuccess: async () => { setUser(null); await invalidate(); } });
}
