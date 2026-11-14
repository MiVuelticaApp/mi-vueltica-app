import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DateField } from '@/components/system/DateField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet, SheetHeader } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useAppLocation, useToggleSave, useVuelticas } from '@/data/queries';
import { PLAN_RADIUS_KM, planItinerary, type Plan } from '@/domain/planner';
import type { VuelticaView } from '@/domain/types';
import { toCandidates } from '@/features/plan/candidates';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { formatCRC, formatTime } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useFilters } from '@/state/filters';

const STOP_OPTIONS = ['1', '2', '3', '4', '5', '6'] as const;
type StopOption = (typeof STOP_OPTIONS)[number];

/** Next quarter hour from now. */
function defaultStart(): Date {
  const d = new Date(now());
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return d;
}

/** "Armame el plan" (#32): pick a time window and how many stops, get an ordered outing with what is near. */
export default function ArmarPlan() {
  const filters = useFilters((s) => s.filters);
  const from = useAppLocation();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(() => new Date(defaultStart().getTime() + 3 * 3600_000));
  const [stops, setStops] = useState<StopOption>('3');
  const [request, setRequest] = useState<{ start: Date; end: Date; stops: number; avoid?: Set<string> } | null>(null);
  // Same filters as the map, a wider radius, and every date: the window decides which events count.
  const q = useVuelticas({ ...filters, nearMe: true, distanceKm: PLAN_RADIUS_KM, date: 'any' });
  const toggle = useToggleSave();
  const requireAuth = useRequireAuth();

  const byId = useMemo(() => new Map((q.data?.items ?? []).map((v) => [v.id, v])), [q.data]);
  const plan: Plan | null = useMemo(() => {
    if (!request || !q.data) return null;
    return planItinerary(toCandidates(q.data.items), { ...request, from });
  }, [request, q.data, from]);

  const build = (avoid?: Set<string>) => {
    if (end <= start) {
      toast(t.plan.windowInvalid);
      return;
    }
    setRequest({ start, end, stops: Number(stops), avoid });
  };
  const again = () => plan && build(new Set([...(request?.avoid ?? []), ...plan.stops.map((s) => s.id)]));

  const planItems = (plan?.stops ?? []).map((s) => ({ stop: s, v: byId.get(s.id) })).filter((x): x is { stop: (typeof x)['stop']; v: VuelticaView } => !!x.v);
  const cost = planItems.reduce((sum, { v }) => sum + (v.priceUnknown ? 0 : v.pricePerPerson), 0);
  const costUnknown = planItems.some(({ v }) => v.priceUnknown);

  const saveAll = () =>
    requireAuth('save', { kind: 'save', id: planItems[0]?.v.id ?? '' }, { next: '/armar-plan' }, async () => {
      try {
        for (const { v } of planItems) if (!v.saved) await toggle.mutateAsync({ id: v.id, saved: false });
        toast(t.plan.savedAll);
      } catch {
        toast(t.common.errorBody);
      }
    });

  return (
    <Sheet testID="plan.sheet" tall>
      <SheetHeader testID="plan.header" title={t.plan.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text variant="callout" color="labelSecondary" style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{t.plan.subtitle}</Text>
        <Group>
          <Row title={t.plan.from} right={<DateField testID="plan.start" mode="time" accessibilityLabel={t.plan.from} value={start} onChange={setStart} />} />
          <Row title={t.plan.to} right={<DateField testID="plan.end" mode="time" accessibilityLabel={t.plan.to} value={end} onChange={setEnd} />} last />
        </Group>
        <SectionHeader title={t.plan.stops} />
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented<StopOption> testID="plan.stops" value={stops} onChange={setStops} options={STOP_OPTIONS.map((n) => ({ value: n, label: n }))} />
        </View>
        <View style={{ padding: 16 }}>
          <Button testID="plan.build" label={q.data ? t.plan.build : t.plan.loading} disabled={!q.data} onPress={() => build()} full />
        </View>

        {plan ? (
          <View testID="plan.result" style={{ gap: 8 }}>
            {plan.short ? (
              <Text testID="plan.short" variant="callout" color="labelSecondary" style={{ paddingHorizontal: 16 }}>
                {t.plan.short(plan.stops.length, formatTime(request!.start), formatTime(request!.end))}
              </Text>
            ) : null}
            {planItems.length === 0 ? (
              <EmptyState testID="plan.empty" icon="calendar" title={t.plan.short(0, formatTime(request!.start), formatTime(request!.end))} body={t.plan.emptyBody} />
            ) : (
              <>
                <Group>
                  {planItems.map(({ stop, v }, i) => (
                    <Row
                      key={v.id}
                      testID={`plan.stop.${i}`}
                      icon={v.type === 'evento' ? 'ticket' : 'bench'}
                      iconBg={v.type === 'evento' ? 'event' : 'place'}
                      title={`${formatTime(stop.begin)}–${formatTime(stop.leave)} · ${v.name}`}
                      subtitle={[
                        t.plan.travel(stop.travelMin),
                        stop.begin > stop.arrive ? t.plan.startsAt(formatTime(stop.begin)) : null,
                        stop.hoursUnknown ? t.plan.hoursUnknown : null,
                      ].filter(Boolean).join(' · ')}
                      chevron
                      onPress={() => router.push({ pathname: '/vueltica/[id]', params: { id: v.id } })}
                      last={i === planItems.length - 1}
                    />
                  ))}
                </Group>
                <Text testID="plan.total" variant="caption" color="labelSecondary" style={{ paddingHorizontal: 16 }}>
                  {t.plan.total(formatCRC(cost), costUnknown)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8 }}>
                  <Button testID="plan.again" variant="secondary" label={t.plan.again} onPress={again} style={{ flex: 1 }} />
                  <Button testID="plan.saveAll" label={t.plan.saveAll} onPress={saveAll} loading={toggle.isPending} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
