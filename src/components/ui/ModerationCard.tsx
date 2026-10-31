import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import type { ModerationQueue } from '@/data/api';
import { formatCRC, formatEventShort, formatRelative } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useAppTheme } from '@/theme/useAppTheme';
import { Button } from './Button';
import { PhotoTile } from './PhotoTile';
import { Tap } from './Tap';
import { Text } from './Text';

type Item = ModerationQueue['nuevas'][number];

/** Figma "Moderation Card": new (Rechazar / Aprobar) and reported (Sigue igual / Ocultar vueltica) variants. */
export function ModerationCard({ item, voted, onVote, onUndo, onOpen }: { item: Item; voted?: 'for' | 'against'; onVote: (c: 'for' | 'against') => void; onUndo: () => void; onOpen: () => void }) {
  const { c } = useAppTheme();
  const v = item.vuelticaView;
  const isNew = item.kind === 'nueva';
  const total = item.votesFor + item.votesAgainst;
  const progress = Math.min(1, total / Math.max(1, item.votesNeeded));
  const meta = [v.type === 'evento' ? 'Evento' : 'Lugar', v.address.split(',')[0].split(' · ')[0], v.startAt ? formatEventShort(v.startAt).split(' · ')[0] : null, v.priceTier === 'gratis' ? 'Gratis' : formatCRC(v.pricePerPerson)].filter(Boolean).join(' · ');
  const ago = (iso?: string) => (iso ? formatRelative(iso, now()) : '');
  return (
    <View testID={`mod.card.${v.id}`} style={{ marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, gap: 12 }}>
      <Tap testID={`mod.open.${v.id}`} label={v.name} onPress={onOpen} style={{ flexDirection: 'row', gap: 12 }}>
        <PhotoTile item={v} uri={v.photos[0]} size={56} radius={8} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{v.name}</Text>
          <Text variant="caption" color="onSurfaceVariant">{meta}</Text>
        </View>
      </Tap>
      {isNew ? (
        <>
          <Text variant="caption" color="onSurfaceVariant">{t.moderation.by(v.authorName, ago(v.createdAt))}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.priceContainer }}>
            <View style={{ width: `${Math.max(2, progress * 100)}%`, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
          </View>
          <Text testID={`mod.progress.${v.id}`} variant="caption" color="onSurfaceVariant">{t.moderation.progress(total, item.votesNeeded)}</Text>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, backgroundColor: '#ffc72c' }}>
            <Icon name="flag" size={18} color="#0b1220" />
            <Text testID={`mod.reports.${v.id}`} variant="callout" bold color="#0b1220">{t.moderation.reports(item.reportCount ?? 0, t.report.reasons[item.topReason ?? 'otro'])}</Text>
          </View>
          <Text variant="caption" color="onSurfaceVariant">{t.moderation.lastReport(ago(item.lastReportAt), v.authorName)}</Text>
        </>
      )}
      {voted ? (
        <View testID={`mod.thanks.${v.id}`} accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: c.freeContainer }}>
          <Icon name="checkCircle" size={20} color="free" />
          <Text variant="callout" color="free" style={{ flex: 1 }}>{t.moderation.thanks}</Text>
          <Tap testID={`mod.undo.${v.id}`} label={t.moderation.undo} onPress={onUndo} hitSlop={8}>
            <Text variant="callout" bold color="primary">{t.moderation.undo}</Text>
          </Tap>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button testID={`mod.against.${v.id}`} label={isNew ? t.moderation.reject : t.moderation.keep} variant="outline" full={false} style={{ flex: 1 }} size="compact" onPress={() => onVote('against')} />
          <Button testID={`mod.for.${v.id}`} label={isNew ? t.moderation.approve : t.moderation.hide} full={false} style={{ flex: 1 }} size="compact" onPress={() => onVote('for')} />
        </View>
      )}
    </View>
  );
}
