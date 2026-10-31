import { View } from 'react-native';
import { Text } from '@/components/ui/Text';

export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="stub.guardados">
      <Text>guardados</Text>
    </View>
  );
}
