import { router } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import type { MyVuelticaItem } from '@/data/api';
import { formatCRC } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

export const formatInt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** One row of "Mis vuelticas" with its status line (En revisión · 3 de 5 votos / Publicado · views / No publicado · reason). */
export function MyVuelticaRow({ item, onWithdraw, compact }: { item: MyVuelticaItem; onWithdraw?: () => void; compact?: boolean }) {
  const { c } = useAppTheme();
  const v = item.vuelticaView;
  const status =
    v.status === 'pendiente' ? t.mine.review(item.votesFor + item.votesAgainst, item.votesNeeded)
    : v.status === 'publicada' ? t.mine.published(v.views).replace(String(v.views), formatInt(v.views))
    : v.status === 'oculta' ? t.mine.hidden
    : t.mine.rejected(v.rejectionReason ?? (v.pricePerPerson > 5000 ? t.mine.reasonPrice(formatCRC(v.pricePerPerson)) : ''));
  const tile = v.status === 'pendiente' ? { bg: c.event, icon: 'clock' as const } : v.status === 'publicada' ? { bg: c.primary, icon: 'check' as const } : { bg: c.danger, icon: 'close' as const };
  return (
    <View style={{ marginHorizontal: compact ? 0 : 16, backgroundColor: c.surface, borderRadius: 16 }}>
      <Tap testID={`mine.row.${v.id}`} label={`${v.name}. ${status}`} onPress={() => router.push({ pathname: '/vueltica/[id]', params: { id: v.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tile.icon} size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body" numberOfLines={1}>{v.name}</Text>
          <Text testID={`mine.status.${v.id}`} variant="caption" color="labelSecondary">{status}</Text>
        </View>
        <Icon name="chevronRight" size={20} color="labelTertiary" />
      </Tap>
      {v.status === 'pendiente' && onWithdraw ? (
        <Tap testID={`mine.withdraw.${v.id}`} label={t.mine.withdraw} onPress={onWithdraw} style={{ paddingHorizontal: 14, paddingBottom: 12, alignSelf: 'flex-start' }}>
          <Text variant="callout" bold color="danger">{t.mine.withdraw}</Text>
        </Tap>
      ) : null}
    </View>
  );
}
