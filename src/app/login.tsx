import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPreview } from '@/components/map/MapPreview';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Group, Row } from '@/components/ui/Section';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useSignIn } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

const REASONS = t.login.gate;

/** 05 Iniciar sesión: optional sign-in (Apple, Google, email). Mock: always succeeds. `?next=` is restored afterwards. */
export default function Login() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: keyof typeof REASONS }>();
  const signIn = useSignIn();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const leave = () => {
    if (next) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const dismiss = () => {
    // "Ahora no": drop the action that needed the account.
    useSession.getState().setPending(null);
    if (next) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const go = async (provider: 'apple' | 'google' | 'email', mail?: string) => {
    try {
      await signIn.mutateAsync({ provider, email: mail });
      leave();
    } catch {
      toast(t.common.errorBody);
    }
  };
  const submitEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t.login.emailInvalid);
      return;
    }
    setError(null);
    void go('email', email.trim());
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
        {emailMode ? (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: c.groupedSecondary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
              <TextField testID="login.email" accessibilityLabel={t.login.emailTitle} value={email} onChangeText={setEmail} placeholder={t.login.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoFocus onSubmitEditing={submitEmail} returnKeyType="go" />
            </View>
            {error ? <Text testID="login.emailError" variant="callout" color="danger">{error}</Text> : null}
            <Button testID="login.emailSubmit" label={t.login.emailSubmit} onPress={submitEmail} loading={signIn.isPending} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Button testID="login.apple" variant="dark" icon="apple" label={t.login.apple} onPress={() => go('apple')} loading={signIn.isPending} />
            <Button testID="login.google" variant="outline" icon="google" label={t.login.google} onPress={() => go('google')} />
            <Button testID="login.email.button" variant="glass" full icon="mail" label={t.login.email} onPress={() => setEmailMode(true)} />
          </View>
        )}
        <Text variant="caption" color="labelSecondary" align="center" style={{ lineHeight: 18 }}>
          {t.login.legal}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Tap testID="login.terms" label={t.login.terms} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terminos' } })}><Text variant="caption" color="primary">{t.login.terms}</Text></Tap>
          <Tap testID="login.privacy" label={t.login.privacy} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacidad' } })}><Text variant="caption" color="primary">{t.login.privacy}</Text></Tap>
        </View>
      </ScrollView>
    </View>
  );
}
