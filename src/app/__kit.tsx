import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Banner } from '@/components/ui/Banner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Segmented } from '@/components/ui/Segmented';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { RatingInline, StarInput } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { Checkbox } from '@/components/system/Checkbox';
import { Slider } from '@/components/system/Slider';
import { Switch } from '@/components/system/Switch';
import { TextField } from '@/components/system/TextField';
import { MAP_IMAGES } from '@/components/map/pins';
import { useAppTheme } from '@/theme/useAppTheme';

/** Dev-only component gallery (M3): /__kit */
export default function Kit() {
  const { c } = useAppTheme();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(false);
  const [sl, setSl] = useState(3);
  const [txt, setTxt] = useState('');
  const [stars, setStars] = useState(4);
  void MAP_IMAGES;
  return (
    <ScrollView testID="kit.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ padding: 16, gap: 16, paddingTop: 60 }}>
      <Text variant="display">Kit</Text>
      <Text variant="title">Título</Text><Text variant="headline">Headline</Text><Text variant="body">Body 17/26</Text><Text variant="callout">Callout</Text><Text variant="caption">Caption</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip label="Filtros" icon="filter" /><Chip label="Lugares" icon="bench" selected /><Chip label="Solo gratis" glass />
        <Chip label="Gratis" option selected /><Chip label="Menos de ₡2.500" option />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Badge kind="free" label="Gratis" /><Badge kind="event" label="Evento" /><Badge kind="student" label="Estudiantes" /><Badge kind="senior" label="Ciudadanos de oro" />
        <Badge kind="stale" label="¿Sigue igual? Verificar" /><Badge kind="price" label="₡1.500 · domingos gratis" /><Badge kind="family" label="Familias" />
      </View>
      <Button label="Primario" /><Button label="Secundario" variant="secondary" /><Button label="Glass" variant="glass" /><Button label="Texto" variant="text" /><Button label="Peligro" variant="danger" />
      <View style={{ flexDirection: 'row', gap: 12 }}><IconButton icon="search" label="Buscar" /><IconButton icon="close" label="Cerrar" prominent /><RatingInline avg={4.7} /></View>
      <Segmented options={[{ value: 'a', label: 'Todo' }, { value: 'b', label: 'Lugares' }, { value: 'c', label: 'Eventos' }]} value={seg} onChange={setSeg} />
      <Group>
        <Row title="Modo oscuro" right={<Switch accessibilityLabel="Modo oscuro" value={sw} onValueChange={setSw} />} />
        <Row title="Casilla" right={<Checkbox accessibilityLabel="Casilla" value={cb} onValueChange={setCb} />} />
        <Row title="Distancia" value={`${sl} km`} last />
      </Group>
      <Slider accessibilityLabel="Distancia" value={sl} onValueChange={setSl} min={1} max={5} step={1} />
      <Group><View style={{ padding: 16 }}><TextField accessibilityLabel="Texto" value={txt} onChangeText={setTxt} placeholder="Escribí algo" /></View></Group>
      <StarInput value={stars} onChange={setStars} showLabel />
      <View style={{ flexDirection: 'row', gap: 12 }}><PhotoTile size={76} item={{ type: 'lugar', category: 'Parque' }} /><PhotoTile size={76} item={{ type: 'evento', category: 'Cine' }} /><PhotoTile size={76} item={{ type: 'lugar', category: 'Museo' }} /></View>
      <Banner icon="wifiOff" tone="warning" text="Sin conexión. Mostrando lo guardado (hace 2 h)." action="Reintentar" />
      <Banner icon="clock" text="Te avisamos 1 día antes de cada evento guardado." action="Cambiar" />
      <SectionHeader title="Sección" />
      <EmptyState icon="search" title="Sin resultados" body="No encontramos planes con estos filtros." />
      <ListSkeleton count={2} />
      <Button label="Toast" variant="outline" onPress={() => toast('Guardado')} />
    </ScrollView>
  );
}
