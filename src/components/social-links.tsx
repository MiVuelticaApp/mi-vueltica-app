import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';

const INSTAGRAM_URL = 'https://www.instagram.com/mi_vueltica/';
const TIKTOK_URL = 'https://www.tiktok.com/@mi_vueltica';
const EMAIL = 'mailto:mivuelticacr@gmail.com';

type SocialButtonProps = {
  href: string;
  label: string;
  symbolName: { ios: string; android: string; web: string };
};

function SocialButton({ href, label, symbolName }: SocialButtonProps) {
  const theme = useTheme();
  return (
    <ExternalLink href={href} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.button}>
          <SymbolView name={symbolName} tintColor={theme.text} size={16} />
          <ThemedText type="small">{label}</ThemedText>
        </ThemedView>
      </Pressable>
    </ExternalLink>
  );
}

function EmailButton() {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(EMAIL)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.button}>
        <SymbolView
          name={{ ios: 'envelope', android: 'email', web: 'email' }}
          tintColor={theme.text}
          size={16}
        />
        <ThemedText type="small">mivuelticacr@gmail.com</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function SocialLinks() {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        Seguinos
      </ThemedText>
      <View style={styles.row}>
        <SocialButton
          href={INSTAGRAM_URL}
          label="Instagram"
          symbolName={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
        />
        <SocialButton
          href={TIKTOK_URL}
          label="TikTok"
          symbolName={{ ios: 'music.note', android: 'music_note', web: 'music_note' }}
        />
      </View>
      <EmailButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
