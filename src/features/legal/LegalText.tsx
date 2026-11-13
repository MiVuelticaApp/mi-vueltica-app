import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { LegalSection } from '@/config/legal';

/** Sections of a legal text: a heading and its paragraphs. */
export function LegalText({ sections, testID }: { sections: LegalSection[]; testID?: string }) {
  return (
    <View testID={testID} style={{ gap: 16 }}>
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <Text variant="headline" accessibilityRole="header">{s.title}</Text>
          {s.body.map((p, i) => (
            <Text key={i} variant="body" style={{ lineHeight: 24 }}>{p}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
