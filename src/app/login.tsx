import { Image } from 'expo-image';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPreview } from '@/components/map/MapPreview';
import { Button } from '@/components/ui/Button';
import { Group, Row } from '@/components/ui/Section';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { api } from '@/data';
import { SignInCancelledError } from '@/data/api';
import { useSignIn } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { PRIVACY_VERSION } from '@/config/legal';
import { PrivacyNotice } from '@/features/legal/PrivacyNotice';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

const REASONS = t.login.gate;

/** 05 Iniciar sesión: optional sign-in with Apple or Google (no email sign-in, API #35). Mock: always succeeds. `?next=` is restored afterwards. */
export default function Login() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: keyof typeof REASONS }>();
  const signIn = useSignIn();

  const isTab = !!next && ['/perfil', '/aportar', '/guardados', '/lista'].includes(next);
  const leave = () => {
    if (next && !isTab) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const dismiss = () => {
    // "Ahora no": drop the action that needed the account.
    useSession.getState().setPending(null);
    if (next && !isTab) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const [notice, setNotice] = useState<'apple' | 'google' | null>(null);
  /** The privacy notice comes first (Ley 8968 art. 5); the accepted version goes with the login. */
  const start = (provider: 'apple' | 'google') => {
    if (useSession.getState().privacyAccepted === PRIVACY_VERSION) void go(provider);
    else setNotice(provider);
  };
  const go = async (provider: 'apple' | 'google') => {
    const p = useSession.getState().pending;
    try {
      await signIn.mutateAsync({ provider, privacyVersion: PRIVACY_VERSION });
      leave();
      if (p?.kind === 'review') {
        useSession.getState().setPending(null);
        setTimeout(() => router.push({ pathname: '/vueltica/[id]/escribir-resena', params: { id: p.id } }), 50);
      }
    } catch (e) {
      // Closing the Apple / Google sheet is not an error.
      if (!(e instanceof SignInCancelledError)) toast(t.common.errorBody);
    }
  };

  return (
    <View testID="login.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
        <Tap testID="login.notNow" label={t.login.notNow} onPress={dismiss} hitSlop={10}><Text variant="body" color="primary">{t.login.notNow}</Text></Tap>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 12 }}>
        <Image source={require('../../assets/brand/logo-full.png')} accessibilityLabel={t.app.name} style={{ width: 220, height: 97, borderRadius: 20, alignSelf: 'center' }} contentFit="contain" />
        <Text variant="callout" color="labelSecondary" align="center" style={{ lineHeight: 22 }}>{t.app.tagline}</Text>
        {reason && REASONS[reason] ? <Text testID="login.reason" variant="headline" align="center" color="primary">{REASONS[reason]}</Text> : null}
        <MapPreview height={110} pins={[{ x: 16, y: 20, kind: 'lugar' }, { x: 40, y: 50, kind: 'evento' }, { x: 84, y: 14, kind: 'lugar' }]} />
        <Group style={{ marginHorizontal: 0 }}>
          <Row icon="bookmark" iconBg="primary" title={t.login.perk1} />
          <Row icon="add" iconBg="event" title={t.login.perk2} />
          <Row icon="star" iconBg="senior" iconColor="#ffffff" title={t.login.perk3} last />
        </Group>
        <View style={{ gap: 12 }}>
          {api.signInProviders.includes('apple') ? <Button testID="login.apple" variant="dark" icon="apple" label={t.login.apple} onPress={() => start('apple')} loading={signIn.isPending} /> : null}
          {api.signInProviders.includes('google') ? <Button testID="login.google" variant="outline" icon="google" label={t.login.google} onPress={() => start('google')} /> : null}
        </View>
        <Text variant="caption" color="labelSecondary" align="center" style={{ lineHeight: 18 }}>
          {t.login.legal}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Tap testID="login.terms" label={t.login.terms} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terminos' } })}><Text variant="caption" color="primary">{t.login.terms}</Text></Tap>
          <Tap testID="login.privacy" label={t.login.privacy} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacidad' } })}><Text variant="caption" color="primary">{t.login.privacy}</Text></Tap>
        </View>
      </ScrollView>
      <PrivacyNotice
        visible={!!notice}
        onAccept={() => {
          const provider = notice!;
          useSession.getState().setPrivacyAccepted(PRIVACY_VERSION);
          setNotice(null);
          void go(provider);
        }}
        onDecline={() => setNotice(null)}
      />
    </View>
  );
}
