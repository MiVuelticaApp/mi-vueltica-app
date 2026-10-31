import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import type { ReputationSummary } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** Figma "Reputation Card": level number + name, points, progress to the next level, current perk, info button. */
export function ReputationCard({ summary, onInfo }: { summary: ReputationSummary; onInfo: () => void }) {
  const { c } = useAppTheme();
  const { level, points, nextLevel, pointsToNext, progress } = summary;
  return (
    <View testID="profile.reputation" style={{ marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="headline">{t.profile.trust}</Text>
        <IconButton testID="profile.trustInfo" icon="info" label={t.profile.info} glass={false} onPress={onInfo} size={36} color={c.primary} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Text testID="profile.levelNumber" variant="title" color="onPrimaryContainer">{level.number}</Text>
        </View>
        <View>
          <Text testID="profile.levelName" variant="headline">{level.name}</Text>
          <Text testID="profile.points" variant="caption" color="labelSecondary">{t.profile.levelOf(level.number, points)}</Text>
        </View>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: c.priceContainer }}>
        <View style={{ width: `${Math.max(2, progress * 100)}%`, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
      </View>
      <Text testID="profile.toNext" variant="caption" color="onSurfaceVariant">{nextLevel ? t.profile.toNext(pointsToNext, nextLevel.name) : t.profile.maxLevel}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: c.surfaceVariant }}>
        <Icon name="check" size={18} color="free" />
        <Text variant="callout" style={{ flex: 1 }}>{level.number >= 3 ? t.profile.perkVotes3 : t.profile.perkVotes5}</Text>
      </View>
    </View>
  );
}
