import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Icon } from '@/components/icons/Icon';
import { useAppTheme } from '@/theme/useAppTheme';
import { Tap } from './Tap';
import { Text } from './Text';

interface ToastState {
  message: string | null;
  action?: { label: string; run: () => void };
  id: number;
  show: (m: string, action?: { label: string; run: () => void }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  id: 0,
  show: (message, action) => set((s) => ({ message, action, id: s.id + 1 })),
  hide: () => set({ message: null, action: undefined }),
}));

export const toast = (m: string, action?: { label: string; run: () => void }) => useToast.getState().show(m, action);

/** Mounted once in the root layout. */
export function ToastHost() {
  const { message, action, id, hide } = useToast();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const tm = setTimeout(hide, action ? 6000 : 3200);
    return () => clearTimeout(tm);
  }, [id, message, action, hide]);
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center', zIndex: 100 }}>
      <View testID="toast" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.onSurface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 480 }}>
        <Icon name="checkCircle" size={20} color={c.surface} />
        <Text variant="callout" color={c.surface} style={{ flexShrink: 1 }}>{message}</Text>
        {action ? (
          <Tap testID="toast.action" label={action.label} onPress={() => { action.run(); hide(); }}>
            <Text variant="callout" bold color={c.primary === '#1b3c8c' ? '#9db6ff' : '#1b3c8c'}>{action.label}</Text>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}
