import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReputationCard } from '@/components/ui/ReputationCard';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { SOCIAL } from '@/config/social';
import { useModerationCount, useMyVuelticas, useReputation, useSignOut } from '@/data/queries';
import { MyVuelticaRow } from '@/features/contribute/MyVuelticaRow';
import { TrustDialog } from '@/features/profile/TrustDialog';
import { canModerate } from '@/domain/rules';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** 14 Perfil (+ 14b Confianza pop-up). */
export default function PerfilScreen() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.userLoaded);
  const rep = useReputation();
  const mine = useMyVuelticas();
  const count = useModerationCount();
  const signOut = useSignOut();
  const [trust, setTrust] = useState(false);
  const level = rep.data?.level.number ?? 0;

  const out = async () => {
    const ok = await confirmDialog({ title: t.profile.signOutTitle, message: t.profile.signOutBody, confirmLabel: t.profile.signOut });
    if (ok) signOut.mutate();
  };
  const social = (url: string) => void Linking.openURL(url).catch(() => {});

  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.groupedBackground }} />;
  if (!user) {
    return (
      <ScrollView testID="profile.signedOut" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}>
        <Text variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 41, paddingHorizontal: 16 }}>{t.profile.title}</Text>
        <EmptyState icon="person" title={t.profile.signedOutTitle} body={t.profile.signedOutBody}>
          <Button testID="profile.signIn" label={t.profile.signIn} full={false} onPress={() => router.push({ pathname: '/login', params: { next: '/perfil' } })} />
        </EmptyState>
        <Group>
          <Row testID="profile.settings" icon="settings" iconBg="onSurfaceVariant" title={t.profile.settings} chevron onPress={() => router.push('/ajustes')} />
          <Row testID="profile.rules" icon="shield" iconBg="onSurfaceVariant" title={t.profile.rules} chevron last onPress={() => router.push('/normas')} />
        </Group>
      </ScrollView>
    );
  }
  const since = new Date(user.memberSince).getFullYear();
  return (
    <View testID="profile.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140, gap: 12 }}>
        <Text variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 41, paddingHorizontal: 16 }}>{t.profile.title}</Text>
        <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
            <Text testID="profile.initials" variant="title" color="onPrimaryContainer">{user.initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text testID="profile.name" variant="title">{user.displayName}</Text>
            <Text testID="profile.since" variant="callout" color="labelSecondary">{`${user.province} · ${t.profile.since(since)}`}</Text>
            {rep.data ? (
              <Tap testID="profile.levelBadge" label={t.profile.level(rep.data.level.number, rep.data.level.name)} onPress={() => setTrust(true)} style={{ alignSelf: 'flex-start' }}>
                <Badge kind="free" label={t.profile.level(rep.data.level.number, rep.data.level.name)} />
              </Tap>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
          {([['vuelticas', user.counts.vuelticas], ['reviews', user.counts.reviews], ['verifications', user.counts.verifications]] as const).map(([k, n]) => (
            <View key={k} testID={`profile.stat.${k}`} style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: c.surface }}>
              <Text variant="title" testID={`profile.stat.${k}.value`}>{n}</Text>
              <Text variant="caption" color="labelSecondary">{t.profile.stats[k]}</Text>
            </View>
          ))}
        </View>
        {rep.data ? <ReputationCard summary={rep.data} onInfo={() => setTrust(true)} /> : null}

        {canModerate(level) ? (
          <>
            <SectionHeader title={t.profile.moderation} />
            <Group>
              <Row testID="profile.moderation" icon="flag" iconBg="onSurfaceVariant" title={t.profile.review(count.data ?? 0)} chevron last onPress={() => router.push('/moderacion')} />
            </Group>
          </>
        ) : null}

        <SectionHeader title={t.profile.mine} right={<Tap testID="profile.mine.all" label={t.detail.seeAll(mine.data?.length ?? 0)} onPress={() => router.push('/mis-vuelticas')}><Text variant="callout" color="primary" bold>{t.common.seeAll}</Text></Tap>} />
        <View style={{ gap: 8 }}>
          {(mine.data ?? []).slice(0, 3).map((i) => <MyVuelticaRow key={i.vuelticaView.id} item={i} />)}
          {mine.data && mine.data.length === 0 ? <Text variant="callout" color="labelSecondary" style={{ paddingHorizontal: 32 }}>{t.empty.myVuelticas}</Text> : null}
        </View>

        <SectionHeader title={t.profile.social} />
        <Group>
          <Row testID="profile.social.instagram" icon="instagram" iconBg="event" title={t.profile.instagram} value={SOCIAL.handle} chevron onPress={() => social(SOCIAL.instagram)} />
          <Row testID="profile.social.tiktok" icon="tiktok" iconBg="onSurface" title={t.profile.tiktok} value={SOCIAL.handle} chevron onPress={() => social(SOCIAL.tiktok)} />
          <Row testID="profile.social.facebook" icon="facebook" iconBg="primary" title={t.profile.facebook} value={SOCIAL.handle} chevron onPress={() => social(SOCIAL.facebook)} />
          <Row testID="profile.social.whatsapp" icon="whatsapp" iconBg="place" title={t.profile.whatsapp} value={SOCIAL.handle} chevron last onPress={() => social(SOCIAL.whatsapp)} />
        </Group>
        <View style={{ height: 8 }} />
        <Group>
          <Row testID="profile.settings" icon="settings" iconBg="onSurfaceVariant" title={t.profile.settings} chevron onPress={() => router.push('/ajustes')} />
          <Row testID="profile.rules" icon="shield" iconBg="onSurfaceVariant" title={t.profile.rules} chevron last onPress={() => router.push('/normas')} />
        </Group>
        <View style={{ height: 8 }} />
        <Group>
          <Row testID="profile.signOut" title={t.profile.signOut} destructive last onPress={() => void out()} />
        </Group>
      </ScrollView>
      <TrustDialog visible={trust} onClose={() => setTrust(false)} currentLevel={level || 1} />
    </View>
  );
}
