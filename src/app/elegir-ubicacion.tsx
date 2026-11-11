import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from '@/components/map/MapView';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useAppLocation } from '@/data/queries';
import { t } from '@/i18n/es-CR';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** Location picker for "Nueva vueltica": tap the map to place the pin, add an address / reference. */
export default function ElegirUbicacion() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { draft, patch } = useDraft();
  const center = useAppLocation();
  const coords = useSession((s) => s.coords);
  const [pin, setPin] = useState(draft.hasLocation ? { lat: draft.lat, lng: draft.lng } : null);
  const [address, setAddress] = useState(draft.address);
  const confirm = () => {
    if (!pin) return;
    patch({ lat: pin.lat, lng: pin.lng, address: address.trim(), hasLocation: true });
    closeSheet();
  };
  return (
    <Sheet testID="location.sheet" tall>
      <SheetHeader testID="location.header" title={t.contribute.pickLocation} />
      <Text variant="callout" color="labelSecondary" align="center" style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{t.contribute.dragMap}</Text>
      <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' }}>
        <MapView items={[]} pending={[]} selectedId={null} center={pin ?? center} showUser={!!coords} recenterToken={0} onSelect={() => {}} onSelectPending={() => {}} onMapPress={(lat, lng) => setPin({ lat, lng })} dropPin={pin ? { ...pin, type: draft.type } : null} />
      </View>
      <View style={{ padding: 16, gap: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
          <TextField testID="location.address" accessibilityLabel={t.contribute.location} value={address} onChangeText={setAddress} placeholder="Dirección o referencia" />
        </View>
        <Button testID="location.confirm" label={t.contribute.useThisLocation} onPress={confirm} disabled={!pin} />
      </View>
    </Sheet>
  );
}
