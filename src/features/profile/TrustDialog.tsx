import { Modal, ScrollView, View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { LEVELS, POINTS } from '@/config/levels';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** 14b Confianza: explains points and levels (opens from the info button and the level badge). */
export function TrustDialog({ visible, onClose, currentLevel }: { visible: boolean; onClose: () => void; currentLevel: number }) {
  const { c } = useAppTheme();
  const earn = [
    { text: t.trust.e1b, pts: POINTS.published },
    { text: t.trust.e2, pts: POINTS.verified },
    { text: t.trust.e3, pts: POINTS.reviewUseful },
    { text: t.trust.e4, pts: POINTS.moderationVote },
  ];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View testID="trust.dialog" accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, maxHeight: '92%', backgroundColor: c.surface, borderRadius: 24, padding: 24 }}>
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="title" color="onPrimaryContainer">{currentLevel}</Text>
              </View>
              <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>{t.trust.title}</Text>
            </View>
            <Text variant="body" style={{ lineHeight: 24 }}>{t.trust.intro}</Text>
            <Text variant="caption" bold color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>{t.trust.earn}</Text>
            {earn.map((e) => (
              <View key={e.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="check" size={18} color="free" />
                <Text variant="callout" style={{ flex: 1 }}>{e.text}</Text>
                <View style={{ backgroundColor: c.primaryContainer, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text variant="label" color="onPrimaryContainer">{`+${e.pts}`}</Text>
                </View>
              </View>
            ))}
            <Text variant="caption" color="labelSecondary" style={{ lineHeight: 18 }}>{t.trust.lose}</Text>
            <Text variant="caption" bold color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>{t.trust.levels}</Text>
            {LEVELS.map((l, i) => (
              <View key={l.number} testID={`trust.level.${l.number}`} accessibilityState={{ selected: l.number === currentLevel }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, backgroundColor: l.number === currentLevel ? c.primaryContainer : undefined }}>
                <Text variant="caption" bold style={{ width: 14 }}>{l.number}</Text>
                <Text variant="caption" bold={l.number === currentLevel} style={{ flex: 1 }}>{l.name}</Text>
                <Text variant="caption" color="onSurfaceVariant" style={{ flex: 1.3, textAlign: 'right' }}>{t.trust.levelPerks[i]}</Text>
              </View>
            ))}
            <Button testID="trust.close" label={t.trust.understood} onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
