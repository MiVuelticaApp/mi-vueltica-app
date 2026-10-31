import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { MapPreview } from '@/components/map/MapPreview';
import { Checkbox } from '@/components/system/Checkbox';
import { DateField } from '@/components/system/DateField';
import { Menu } from '@/components/system/Menu';
import { Switch } from '@/components/system/Switch';
import { TextField } from '@/components/system/TextField';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Segmented } from '@/components/ui/Segmented';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useCreateVueltica } from '@/data/queries';
import { ValidationError } from '@/data/api';
import { isPublishablePrice } from '@/domain/rules';
import type { Audience, VuelticaType } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { pickPhotos } from '@/lib/photos';
import { isDirty, useDraft } from '@/state/draft';
import { useAppTheme } from '@/theme/useAppTheme';

const AUDS: { id: Audience; label: string; icon?: 'people' | 'school' | 'medal' }[] = [
  { id: 'todo', label: t.contribute.everyone },
  { id: 'familias', label: t.contribute.families, icon: 'people' },
  { id: 'estudiantes', label: t.contribute.students, icon: 'school' },
  { id: 'ciudadanosOro', label: t.contribute.seniors, icon: 'medal' },
];

const digits = (s: string) => Number(s.replace(/\D/g, '') || '0');

/** 06 Nueva vueltica (FR-11.x). Draft lives in `useDraft`; submit is pinned at the bottom (+ ✓ on iOS). */
export function ContributeForm() {
  const { c, isIOS, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { draft: d, patch, reset } = useDraft();
  const create = useCreateVueltica();
  const [priceError, setPriceError] = useState(false);
  const price = digits(d.price);
  const tooExpensive = d.paid && !isPublishablePrice(price);
  const priceInvalid = d.paid && (price <= 0 || tooExpensive);
  const cats = d.type === 'lugar' ? t.contribute.categories.place : t.contribute.categories.event;
  const valid = d.name.trim().length > 0 && d.category !== '' && d.hasLocation && d.confirm && !priceInvalid;
  const reasons = useMemo(() => [!d.name.trim() && t.contribute.needName, !d.category && t.contribute.needCategory, !d.hasLocation && t.contribute.needLocation].filter(Boolean) as string[], [d.name, d.category, d.hasLocation]);

  const close = async () => {
    if (isDirty(d)) {
      const ok = await confirmDialog({ title: t.contribute.discardTitle, message: t.contribute.discardBody, confirmLabel: t.contribute.discard, cancelLabel: t.contribute.keepEditing, destructive: true });
      if (!ok) return;
    }
    reset();
    router.navigate('/');
  };

  const submit = () => {
    if (!valid) return;
    const startAt = d.type === 'evento' ? mergeDate(d.date, d.start) : undefined;
    const endAt = d.type === 'evento' ? mergeDate(d.date, d.end) : undefined;
    create.mutate(
      {
        type: d.type, name: d.name, category: d.category, description: d.description.trim(), lat: d.lat, lng: d.lng, address: d.address || t.contribute.defaultAddress,
        province: d.province, startAt, endAt, openingHours: d.type === 'lugar' ? d.openingHours.trim() || undefined : undefined,
        pricePerPerson: d.paid ? price : 0, freeFor: d.paid ? [...(d.freeStudents ? (['estudiantes'] as const) : []), ...(d.freeSeniors ? (['ciudadanosOro'] as const) : [])] : [],
        audiences: d.audiences.length ? d.audiences : ['todo'], wheelchair: d.wheelchair, photos: d.photos,
      },
      {
        onSuccess: (r) => {
          reset();
          router.replace({ pathname: '/vueltica-enviada/[id]', params: { id: r.vueltica.id } });
        },
        onError: (e) => {
          if (e instanceof ValidationError && e.field === 'price') setPriceError(true);
          else toast(t.common.errorBody);
        },
      },
    );
  };

  const toggleAud = (a: Audience) => {
    if (a === 'todo') return patch({ audiences: ['todo'] });
    const has = d.audiences.includes(a);
    const next = has ? d.audiences.filter((x) => x !== a) : [...d.audiences.filter((x) => x !== 'todo'), a];
    patch({ audiences: next.length ? next : ['todo'] });
  };

  const confirmControl = isAndroid ? (
    <Checkbox testID="contribute.confirm" accessibilityLabel={t.contribute.confirm} value={d.confirm} onValueChange={(v) => patch({ confirm: v })} />
  ) : (
    <Switch testID="contribute.confirm" accessibilityLabel={t.contribute.confirm} value={d.confirm} onValueChange={(v) => patch({ confirm: v })} />
  );

  return (
    <View testID="contribute.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top }}>
      <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
        <IconButton testID="contribute.close" icon="close" label={t.common.close} onPress={() => void close()} />
        <Text variant="headline" bold align="center" accessibilityRole="header" style={{ flex: 1 }}>{t.contribute.title}</Text>
        {isIOS || !isAndroid ? <IconButton testID="contribute.check" icon="check" label={t.contribute.submitA11y} prominent disabled={!valid || create.isPending} onPress={submit} /> : <View style={{ width: 44 }} />}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 150, gap: 0 }} keyboardShouldPersistTaps="handled">
        <Banner icon="info" text={t.contribute.info} testID="contribute.info" />
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Segmented<VuelticaType>
            testID="contribute.type"
            value={d.type}
            onChange={(v) => patch({ type: v, category: '' })}
            options={[{ value: 'lugar', label: t.contribute.place }, { value: 'evento', label: t.contribute.event }]}
          />
        </View>

        <SectionHeader title={t.contribute.details} />
        <Group>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <TextField testID="contribute.name" accessibilityLabel={t.contribute.name} value={d.name} onChangeText={(v) => patch({ name: v })} placeholder={t.contribute.namePlaceholder} maxLength={80} />
          </View>
          <View style={{ height: 1, backgroundColor: c.separator, marginLeft: 16 }} />
          <Row title={t.contribute.category} last right={<Menu testID="contribute.category" accessibilityLabel={t.contribute.category} value={d.category} onChange={(v) => patch({ category: v })} options={[{ value: '', label: 'Elegir…' }, ...cats.map((x) => ({ value: x, label: x }))]} />} />
        </Group>

        <SectionHeader title={t.contribute.location} />
        <Group>
          <MapPreview height={120} pins={d.hasLocation ? [{ x: 50, y: 36, kind: d.type }] : []} />
          <Tap testID="contribute.location" label={`${t.contribute.location}: ${d.hasLocation ? d.address || t.contribute.defaultAddress : t.contribute.pickLocation}`} onPress={() => router.push('/elegir-ubicacion')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
            <Icon name="pin" size={22} color="primary" />
            <Text variant="body" style={{ flex: 1 }} numberOfLines={2} testID="contribute.address">{d.hasLocation ? d.address || t.contribute.defaultAddress : t.contribute.pickLocation}</Text>
            <Text variant="body" color="labelSecondary">{t.contribute.change}</Text>
          </Tap>
        </Group>

        {d.type === 'evento' ? (
          <>
            <SectionHeader title={t.contribute.when} />
            <Group>
              <Row icon="calendar" iconBg="student" title={t.contribute.date} right={<DateField testID="contribute.date" mode="date" accessibilityLabel={t.contribute.date} value={new Date(d.date)} minimumDate={new Date()} onChange={(x) => patch({ date: x.toISOString() })} />} />
              <Row icon="clock" iconBg="event" title={t.contribute.start} right={<DateField testID="contribute.start" mode="time" accessibilityLabel={t.contribute.start} value={new Date(d.start)} onChange={(x) => patch({ start: x.toISOString() })} />} />
              <Row title={t.contribute.end} last right={<DateField testID="contribute.end" mode="time" accessibilityLabel={t.contribute.end} value={new Date(d.end)} onChange={(x) => patch({ end: x.toISOString() })} />} />
            </Group>
          </>
        ) : (
          <>
            <SectionHeader title={t.contribute.openingHours} />
            <Group>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <TextField testID="contribute.hours" accessibilityLabel={t.contribute.openingHours} value={d.openingHours} onChangeText={(v) => patch({ openingHours: v })} placeholder="Ej.: Mar–Dom · 9:00 a.m. – 5:00 p.m." />
              </View>
            </Group>
          </>
        )}

        <SectionHeader title={t.contribute.description} />
        <Group>
          <View style={{ padding: 16 }}>
            <TextField testID="contribute.description" accessibilityLabel={t.contribute.description} value={d.description} onChangeText={(v) => patch({ description: v })} placeholder={t.contribute.descriptionPlaceholder} multiline rows={3} />
          </View>
        </Group>

        <SectionHeader title={t.contribute.cost} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Segmented<'free' | 'paid'> testID="contribute.cost" value={d.paid ? 'paid' : 'free'} onChange={(v) => { patch({ paid: v === 'paid' }); setPriceError(false); }} options={[{ value: 'free', label: t.contribute.free }, { value: 'paid', label: t.contribute.paid }]} />
        </View>
        {d.paid ? (
          <>
            <Group>
              <Row title={t.contribute.pricePerPerson} right={
                <View style={{ backgroundColor: c.priceContainer, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 96, flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="body" color="onSurfaceVariant">₡</Text>
                  <TextField testID="contribute.price" accessibilityLabel={t.contribute.pricePerPerson} value={d.price} onChangeText={(v) => { patch({ price: v.replace(/\D/g, '') }); setPriceError(false); }} keyboardType="number-pad" placeholder="1000" />
                </View>
              } />
              <Row title={t.contribute.freeStudents} right={<Switch testID="contribute.freeStudents" accessibilityLabel={t.contribute.freeStudents} value={d.freeStudents} onValueChange={(v) => patch({ freeStudents: v })} />} />
              <Row title={t.contribute.freeSeniors} last right={<Switch testID="contribute.freeSeniors" accessibilityLabel={t.contribute.freeSeniors} value={d.freeSeniors} onValueChange={(v) => patch({ freeSeniors: v })} />} />
            </Group>
            {tooExpensive || priceError ? (
              <Text testID="contribute.priceError" accessibilityRole="alert" variant="callout" color="danger" style={{ paddingHorizontal: 32, paddingTop: 8 }}>{t.contribute.priceError}</Text>
            ) : (
              <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 8 }}>{t.contribute.maxNote}</Text>
            )}
          </>
        ) : null}

        <SectionHeader title={t.contribute.whoFor} />
        <Group>
          {AUDS.map((a, i) => (
            <Row key={a.id} testID={`contribute.aud.${a.id}`} icon={a.icon} iconBg={a.icon === 'school' ? 'student' : a.icon === 'medal' ? 'senior' : 'primary'} title={a.label} onPress={() => toggleAud(a.id)} last={i === AUDS.length - 1} right={d.audiences.includes(a.id) ? <Icon name="check" size={20} color="primary" /> : null} accessibilityLabel={`${a.label}${d.audiences.includes(a.id) ? ', seleccionado' : ''}`} />
          ))}
        </Group>

        <SectionHeader title={t.contribute.photos} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {d.photos.length < 5 ? (
            <Tap testID="contribute.addPhoto" label={t.contribute.add} onPress={async () => patch({ photos: [...d.photos, ...(await pickPhotos(5 - d.photos.length))].slice(0, 5) })} style={{ width: 100, height: 100, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="camera" size={24} color="primary" />
              <Text variant="label" color="primary">{t.contribute.add}</Text>
            </Tap>
          ) : null}
          {d.photos.map((p, i) => (
            <View key={p + i}>
              <PhotoTile uri={p} item={d} size={100} radius={16} />
              <IconButton icon="close" label={t.contribute.remove} size={28} style={{ position: 'absolute', top: 4, right: 4 }} onPress={() => patch({ photos: d.photos.filter((_, j) => j !== i) })} testID={`contribute.removePhoto.${i}`} />
            </View>
          ))}
        </ScrollView>
        {d.photos.length >= 5 ? <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 6 }}>{t.contribute.limit}</Text> : null}

        <View style={{ marginTop: 16 }}>
          <Group>
            <Row title={t.contribute.confirm} last right={confirmControl} />
          </Group>
        </View>
        <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 10, lineHeight: 18 }}>{t.contribute.authorNote}</Text>
        {!valid && reasons.length > 0 ? <Text testID="contribute.missing" variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 6 }}>{reasons.join(' · ')}</Text> : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) + 74, backgroundColor: c.groupedBackground }}>
        <Button testID="contribute.submit" label={t.contribute.submit} onPress={submit} disabled={!valid} loading={create.isPending} />
      </View>
    </View>
  );
}

/** Date from `date` with the time of day of `time`. */
function mergeDate(date: string, time: string): string {
  const a = new Date(date);
  const b = new Date(time);
  a.setHours(b.getHours(), b.getMinutes(), 0, 0);
  return a.toISOString();
}
