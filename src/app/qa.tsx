import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { AuthRequiredError, ForbiddenError, ValidationError } from '@/data/api';
import { useQaSignIn } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { PRIVACY_VERSION } from '@/config/legal';
import { PrivacyNotice } from '@/features/legal/PrivacyNotice';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** Store-review sign-in (email + password). Only linked from the login screen when `IS_ON_REVIEW` is on. `?next=` is restored afterwards. */
export default function Qa() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const qaSignIn = useQaSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState(false);

  const isTab = !!next && ['/perfil', '/aportar', '/guardados', '/lista'].includes(next);
  const leave = () => {
    if (next && !isTab) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const go = async () => {
    try {
      await qaSignIn.mutateAsync({ email: email.trim(), password, privacyVersion: PRIVACY_VERSION });
      leave();
    } catch (e) {
      toast(e instanceof AuthRequiredError || e instanceof ValidationError || e instanceof ForbiddenError ? t.qa.invalid : t.common.errorBody);
    }
  };
  /** The privacy notice comes first (Ley 8968 art. 5), as on the regular login. */
  const submit = () => {
    if (!email.trim() || !password) {
      toast(t.qa.required);
      return;
    }
    if (useSession.getState().privacyAccepted === PRIVACY_VERSION) void go();
    else setNotice(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View testID="qa.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
          <Tap testID="qa.close" label={t.common.back} onPress={leave} hitSlop={10}><Text variant="body" color="primary">{t.common.back}</Text></Tap>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 12 }}>
          <Text variant="title" align="center">{t.qa.title}</Text>
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
              <Text variant="caption" color="labelSecondary">{t.qa.email}</Text>
              <TextField testID="qa.email" accessibilityLabel={t.qa.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="go" />
            </View>
            <View style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
              <Text variant="caption" color="labelSecondary">{t.qa.password}</Text>
              <TextField testID="qa.password" accessibilityLabel={t.qa.password} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" returnKeyType="go" onSubmitEditing={submit} />
            </View>
          </View>
          <Button testID="qa.submit" label={t.qa.submit} onPress={submit} loading={qaSignIn.isPending} />
        </ScrollView>
        <PrivacyNotice
          visible={notice}
          onAccept={() => {
            useSession.getState().setPrivacyAccepted(PRIVACY_VERSION);
            setNotice(false);
            void go();
          }}
          onDecline={() => setNotice(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
