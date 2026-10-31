import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { glassStyle } from '@/components/ui/glass';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

const ITEMS: { name: string; label: string; icon: IconName; id: string }[] = [
  { name: 'index', label: t.tabs.map, icon: 'map', id: 'tabs.map' },
  { name: 'lista', label: t.tabs.list, icon: 'list', id: 'tabs.list' },
  { name: 'aportar', label: t.tabs.contribute, icon: 'add', id: 'tabs.contribute' },
  { name: 'guardados', label: t.tabs.saved, icon: 'bookmark', id: 'tabs.saved' },
  { name: 'perfil', label: t.tabs.profile, icon: 'person', id: 'tabs.profile' },
];

/** Web (test target only): a JS tab bar that mimics the native glass bar. */
function WebTabBar({ state }: { state: { index: number; routes: { key: string; name: string }[] } }) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), alignItems: 'center' }}>
      <View accessibilityRole="tablist" style={[{ flexDirection: 'row', padding: 4, borderRadius: 31 }, glassStyle(c)]}>
        {ITEMS.map((it) => {
          const idx = state.routes.findIndex((r) => r.name === it.name);
          const sel = state.index === idx;
          return (
            <Tap key={it.name} testID={it.id} label={it.label} accessibilityRole="tab" accessibilityState={{ selected: sel }} onPress={() => router.navigate(it.name === 'index' ? '/' : (`/${it.name}` as '/lista'))} style={{ width: 68, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: sel ? c.fillTertiary : undefined }}>
              <Icon name={it.icon} size={24} color={sel ? 'primary' : 'onSurface'} />
              <Text system bold variant="caption" color={sel ? 'primary' : 'onSurface'} style={{ fontSize: 10, lineHeight: 12 }}>{it.label}</Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <WebTabBar {...(p as unknown as Parameters<typeof WebTabBar>[0])} />}>
      {ITEMS.map((i) => (
        <Tabs.Screen key={i.name} name={i.name} />
      ))}
    </Tabs>
  );
}
