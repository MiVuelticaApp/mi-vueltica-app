import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { DateField } from '@/components/system/DateField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useVerify, useVuelticaDetail } from '@/data/queries';
import { canVerifyPrice, levelForPoints } from '@/domain/rules';
import type { PricePaid, StillHappening } from '@/domain/types';
import { formatTime } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { pickPhotos } from '@/lib/photos';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** 09 ¿Sigue siendo gratis? verification sheet (FR-9.1): single-choice chips + optional photo. */
export default function Verificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const q = useVuelticaDetail(id);
  const user = useSession((s) => s.user);
  const verify = useVerify();
  const [still, setStill] = useState<StillHappening>('si');
  const [price, setPrice] = useState<PricePaid | null>(null);
  const [schedule, setSchedule] = useState<'si' | 'no' | null>(null);
  const [from, setFrom] = useState(() => new Date(q.data?.vuelticaView.startAt ?? now()));
  const [photo, setPhoto] = useState<string | null>(null);
  const v = q.data?.vuelticaView;
  const level = user ? levelForPoints(user.points).number : 0;
  const priceCounts = canVerifyPrice(level);

  const send = () =>
    verify.mutate(
      { vuelticaId: id, stillHappening: still, pricePaid: price ?? undefined, scheduleCorrect: schedule === null ? undefined : schedule === 'si', correctedTime: schedule === 'no' ? formatTime(from) : undefined, photo: photo ?? undefined },
      {
        onSuccess: (r) => {
          toast(r.queued ? t.offline.queued : user ? t.verify.sent : t.verify.sentGuest);
          closeSheet();
        },
      },
    );

  const opt = <T extends string>(testPrefix: string, value: T, label: string, cur: T | null, set: (x: T) => void) => (
    <Chip key={value} option testID={`${testPrefix}.${value}`} label={label} selected={cur === value} onPress={() => set(value)} />
  );

  return (
    <Sheet testID="verify.sheet" tall>
      <SheetHeader
        testID="verify.header"
        title={t.verify.title}
        subtitle={v?.name}
        right={!isAndroid ? <IconButton testID="verify.send" icon="check" label={t.verify.send} prominent onPress={send} disabled={verify.isPending} /> : undefined}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <SectionHeader title={t.verify.stillHappening} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {opt('verify.still', 'si', t.verify.yes, still, setStill)}
          {opt('verify.still', 'no', t.verify.noGone, still, setStill)}
          {opt('verify.still', 'nose', t.verify.dunno, still, setStill)}
        </View>
        <SectionHeader title={t.verify.pricePaid} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {opt<PricePaid>('verify.price', 'gratis', t.verify.free, price, setPrice)}
          {opt<PricePaid>('verify.price', 'menos2500', t.verify.lt2500, price, setPrice)}
          {opt<PricePaid>('verify.price', 'entre2500y5000', t.verify.mid, price, setPrice)}
          {opt<PricePaid>('verify.price', 'mas5000', t.verify.gt5000, price, setPrice)}
        </View>
        {!priceCounts ? <Text testID="verify.levelNote" variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 6 }}>{t.verify.levelNote}</Text> : null}
        <SectionHeader title={t.verify.scheduleOk} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {opt<'si' | 'no'>('verify.schedule', 'si', t.common.yes, schedule, setSchedule)}
          {opt<'si' | 'no'>('verify.schedule', 'no', t.common.no, schedule, setSchedule)}
        </View>
        {schedule === 'no' ? (
          <View style={{ marginTop: 12 }}>
            <Group>
              <Row title={t.verify.correctTime} last right={<DateField testID="verify.time" mode="time" accessibilityLabel={t.verify.correctTime} value={from} onChange={setFrom} />} />
            </Group>
          </View>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <Group>
            <Tap testID="verify.photo" label={t.verify.photo} onPress={async () => { const [p] = await pickPhotos(1); if (p) setPhoto(p); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <Icon name="camera" size={22} color="primary" />
              <View style={{ flex: 1 }}>
                <Text variant="body" color="primary">{t.verify.photo}</Text>
                <Text variant="caption" color="labelSecondary">{photo ? '1 foto agregada' : t.verify.photoHint}</Text>
              </View>
            </Tap>
          </Group>
        </View>
        <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 12, lineHeight: 18 }}>{t.verify.footer}</Text>
      </ScrollView>
      {isAndroid ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
          <Button testID="verify.send" label={t.verify.send} onPress={send} loading={verify.isPending} />
        </View>
      ) : null}
    </Sheet>
  );
}
