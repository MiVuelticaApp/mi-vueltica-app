import { DEFAULT_LOCATION } from '@/domain/geo';
import { levelForPoints } from '@/domain/rules';
import type { Audience, FreeFor, PriceTier, Province, Review, ReputationEvent, Settings, SpentTier, User, Vueltica, VuelticaType, WentWith } from '@/domain/types';
import { initialsOf } from '@/i18n/format';
import { DB, DB_VERSION } from './db';

export const ANA_ID = 'u-ana';

export const defaultSettings = (): Settings => ({
  darkMode: 'system', textScale: null, largerButtons: false, moreContrast: false, reduceMotion: false,
  notifyReminders: true, notifyNewNearby: false, notifyMyStatus: true, maxPrice: 'hasta5000', directionsApp: 'preguntar',
  rememberedDirections: null, locationPermission: 'undetermined', province: null, reminderOffsetDays: 1,
});

const KM_LAT = 111.32;
const KM_LNG = 111.32 * Math.cos((DEFAULT_LOCATION.lat * Math.PI) / 180);

/** Coordinates at `km` from a center on a compass bearing. */
function at(km: number, bearing: number, c = DEFAULT_LOCATION) {
  const r = (bearing * Math.PI) / 180;
  return { lat: c.lat + (km * Math.cos(r)) / KM_LAT, lng: c.lng + (km * Math.sin(r)) / KM_LNG };
}

type Seed = {
  id: string; type: VuelticaType; name: string; category: string; km: number; bearing: number; tier: PriceTier; price?: number;
  aud?: Audience[]; freeFor?: FreeFor[]; rating: number; count: number; address: string; province?: Province; start?: string; end?: string;
  hours?: string; description?: string; author?: string; wheelchair?: boolean; verified?: string; vcount?: number; center?: { lat: number; lng: number };
  status?: Vueltica['status']; authorId?: string | null; created?: string; views?: number; rejection?: string; hiddenReason?: string; photos?: number;
};

const DESCR = {
  lugar: 'Un espacio abierto para pasear, descansar y compartir con la familia. Entrada libre y ambiente tranquilo todo el año.',
  evento: 'Actividad abierta al público con ambiente familiar. Conviene llegar temprano para conseguir buen lugar.',
};

function mk(s: Seed, now: Date): Vueltica {
  const loc = s.center ? at(s.km, s.bearing, s.center) : at(s.km, s.bearing);
  const price = s.price ?? (s.tier === 'gratis' ? 0 : s.tier === 'hasta2500' ? 2000 : 4000);
  const created = s.created ?? new Date(now.getTime() - 20 * 86400000).toISOString();
  return {
    id: s.id, type: s.type, name: s.name, category: s.category, description: s.description ?? DESCR[s.type],
    photos: Array.from({ length: s.photos ?? 1 }, (_, i) => `ph:${s.id}:${i}`), ...loc, address: s.address, province: s.province ?? 'San José',
    startAt: s.start, endAt: s.end, openingHours: s.hours, priceTier: s.tier, pricePerPerson: price, freeFor: s.freeFor ?? [],
    audiences: s.aud ?? ['todo'], wheelchair: s.wheelchair ?? false, status: s.status ?? 'publicada', authorId: s.authorId === undefined ? null : s.authorId,
    authorName: s.author ?? 'Carlos M.', createdAt: created, lastVerifiedAt: s.verified, verificationCount: s.vcount ?? 6,
    ratingAvg: s.rating, ratingCount: s.count, views: s.views ?? 120, rejectionReason: s.rejection, hiddenReason: s.hiddenReason,
  };
}

const d = (iso: string) => iso; // readability alias for fixed ISO dates (Costa Rica, UTC-6)
const CR = '-06:00';

export function buildSeed(now: Date): DB {
  const iso = (daysAgo: number, h = 10) => new Date(now.getTime() - daysAgo * 86400000 - (10 - h) * 3600000).toISOString();
  const day = (offsetFromNow: number) => {
    const x = new Date(now.getTime() + offsetFromNow * 86400000);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const ev = (days: number, h1: number, h2: number) => ({ start: `${day(days)}T${String(h1).padStart(2, '0')}:00:00${CR}`, end: `${day(days)}T${String(h2).padStart(2, '0')}:00:00${CR}` });
  const SABANA_HOURS = 'Todos los días · 5:00 a.m. – 7:00 p.m.';

  // 20 published plans within 5 km of San José: 14 free, 18 eligible for students.
  const near: Seed[] = [
    { id: 'v-sabana', type: 'lugar', name: 'Parque La Sabana', category: 'Parque', km: 1.2, bearing: 285, tier: 'gratis', aud: ['todo', 'familias'], rating: 4.7, count: 312, address: 'Paseo Colón, Sabana, San José', hours: SABANA_HOURS, wheelchair: true, verified: now.toISOString(), vcount: 41, photos: 3 },
    { id: 'v-jade', type: 'evento', name: 'Noche de Museos: Museo del Jade', category: 'Cultura', km: 2.4, bearing: 80, tier: 'gratis', aud: ['todo', 'estudiantes', 'ciudadanosOro'], freeFor: ['estudiantes', 'ciudadanosOro'], rating: 4.8, count: 126, address: 'Museo del Jade, Plaza de la Cultura · Av. Central, San José', ...ev(4, 18, 22), verified: iso(3), vcount: 23, wheelchair: true, photos: 3, description: 'Una noche con entrada gratuita a los museos del centro: talleres de jade para niñas y niños, cuentacuentos y música en vivo en la plaza. Fila preferencial para estudiantes y ciudadanos de oro presentando carné.' },
    { id: 'v-concierto', type: 'evento', name: 'Concierto en el Parque', category: 'Conciertos', km: 1.8, bearing: 20, tier: 'gratis', aud: ['todo', 'familias', 'estudiantes'], rating: 4.9, count: 88, address: 'Parque Morazán, Barrio Amón, San José', ...ev(5, 16, 18), verified: iso(2), vcount: 12 },
    { id: 'v-luz', type: 'evento', name: 'Festival de la Luz (desfile)', category: 'Cultura', km: 3.0, bearing: 140, tier: 'gratis', aud: ['todo', 'familias', 'estudiantes'], rating: 4.9, count: 540, address: 'Paseo Colón hasta Avenida Segunda, San José', ...ev(39, 17, 21), verified: iso(9), vcount: 31 },
    { id: 'v-mirador', type: 'lugar', name: 'Mirador del Parque del Este', category: 'Mirador', km: 4.2, bearing: 98, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.5, count: 40, address: 'San Pedro, Montes de Oca', hours: 'Todos los días · 6:00 a.m. – 6:00 p.m.', authorId: ANA_ID, author: 'Ana M.', views: 1240, created: iso(40) },
    { id: 'v-morazan', type: 'lugar', name: 'Parque Morazán', category: 'Parque', km: 0.9, bearing: 350, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.4, count: 77, address: 'Barrio Amón, San José', hours: SABANA_HOURS, wheelchair: true },
    { id: 'v-plaza', type: 'lugar', name: 'Plaza de la Cultura', category: 'Plaza', km: 0.6, bearing: 60, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.3, count: 210, address: 'Avenida Central, San José', hours: 'Siempre abierta', wheelchair: true },
    { id: 'v-espana', type: 'lugar', name: 'Parque España', category: 'Parque', km: 1.4, bearing: 25, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.6, count: 95, address: 'Barrio Amón, San José', hours: SABANA_HOURS },
    { id: 'v-museonac', type: 'lugar', name: 'Antiguo Cuartel Bellavista', category: 'Cultura', km: 1.6, bearing: 40, tier: 'gratis', aud: ['todo', 'estudiantes', 'ciudadanosOro'], freeFor: ['estudiantes'], rating: 4.7, count: 180, address: 'Calle 17, Avenida Central, San José', hours: 'Mar–Dom · 8:30 a.m. – 4:30 p.m.', wheelchair: true },
    { id: 'v-biblio', type: 'lugar', name: 'Biblioteca Nacional', category: 'Biblioteca', km: 1.55, bearing: 32, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.5, count: 66, address: 'Calle 5, Barrio Amón, San José', hours: 'Lun–Vie · 8:00 a.m. – 5:00 p.m.', wheelchair: true },
    { id: 'v-nacional', type: 'lugar', name: 'Parque Nacional', category: 'Parque', km: 1.5, bearing: 45, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.4, count: 120, address: 'Avenida 3, San José', hours: SABANA_HOURS },
    { id: 'v-feriaverde', type: 'evento', name: 'Feria verde de Barrio Escalante', category: 'Ferias y mercados', km: 2.8, bearing: 70, tier: 'gratis', aud: ['todo', 'familias', 'estudiantes'], rating: 4.6, count: 58, address: 'Barrio Escalante, San José', ...ev(4, 8, 13) },
    { id: 'v-cineclub', type: 'evento', name: 'Cine club universitario', category: 'Cine', km: 3.9, bearing: 100, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.5, count: 34, address: 'Ciudad Universitaria Rodrigo Facio, San Pedro', ...ev(2, 18, 20), province: 'San José' },
    { id: 'v-lectura', type: 'evento', name: 'Taller de lectura en voz alta', category: 'Talleres', km: 1.7, bearing: 35, tier: 'gratis', aud: ['todo', 'familias', 'estudiantes'], rating: 4.8, count: 22, address: 'Biblioteca Nacional, Barrio Amón', ...ev(0, 15, 17) },
    { id: 'v-ninos', type: 'lugar', name: 'Museo de los Niños', category: 'Museo', km: 3.1, bearing: 15, tier: 'hasta2500', price: 1500, aud: ['todo', 'familias', 'ciudadanosOro'], freeFor: ['ciudadanosOro'], rating: 4.6, count: 204, address: 'Calle 4, Barrio Aranjuez, San José', hours: 'Gratis los domingos · 9:00 a.m. – 4:30 p.m.', wheelchair: true, description: 'Museo interactivo para toda la familia. Entrada de ₡1.500 por persona; los domingos la entrada es gratuita.' },
    { id: 'v-melico', type: 'evento', name: 'Función en el Teatro Melico Salazar', category: 'Cultura', km: 0.8, bearing: 200, tier: 'hasta2500', price: 2500, aud: ['todo', 'estudiantes'], rating: 4.7, count: 49, address: 'Avenida 2, San José', ...ev(10, 19, 21), wheelchair: true },
    { id: 'v-marimba', type: 'evento', name: 'Concierto de marimba', category: 'Conciertos', km: 1.0, bearing: 330, tier: 'hasta2500', price: 2000, aud: ['todo', 'estudiantes'], rating: 4.5, count: 28, address: 'Plaza de la Democracia, San José', ...ev(6, 17, 19) },
    { id: 'v-madc', type: 'lugar', name: 'MADC · Arte y Diseño Contemporáneo', category: 'Galería', km: 2.0, bearing: 120, tier: 'hasta2500', price: 2500, aud: ['todo', 'estudiantes'], rating: 4.6, count: 71, address: 'Calle 15, Avenida 3, San José', hours: 'Mar–Sáb · 9:30 a.m. – 5:00 p.m.' },
    { id: 'v-gastro', type: 'evento', name: 'Festival gastronómico de Escalante', category: 'Ferias y mercados', km: 3.4, bearing: 75, tier: 'hasta5000', price: 4000, aud: ['todo', 'estudiantes'], rating: 4.4, count: 63, address: 'Barrio Escalante, San José', ...ev(11, 11, 20) },
    { id: 'v-zoo', type: 'lugar', name: 'Parque Zoológico Simón Bolívar', category: 'Parque', km: 1.6, bearing: 5, tier: 'hasta5000', price: 3500, aud: ['todo', 'familias', 'estudiantes'], rating: 4.2, count: 150, address: 'Barrio Amón, San José', hours: 'Mar–Dom · 8:00 a.m. – 4:00 p.m.' },
  ];

  const farC = (lat: number, lng: number) => ({ lat, lng });
  const hered = farC(9.9987, -84.1165), alaj = farC(10.0162, -84.2116), cart = farC(9.8644, -83.9194);
  const far: Seed[] = [
    { id: 'v-her1', type: 'lugar', name: 'Parque Central de Heredia', category: 'Parque', km: 0.3, bearing: 10, tier: 'gratis', rating: 4.5, count: 80, address: 'Centro de Heredia', province: 'Heredia', center: hered, hours: SABANA_HOURS },
    { id: 'v-her2', type: 'lugar', name: 'El Fortín de Heredia', category: 'Mirador', km: 0.5, bearing: 100, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.6, count: 99, address: 'Centro de Heredia', province: 'Heredia', center: hered },
    { id: 'v-her3', type: 'evento', name: 'Cuentacuentos en la biblioteca', category: 'Talleres', km: 1.2, bearing: 200, tier: 'gratis', aud: ['todo', 'familias'], rating: 4.8, count: 14, address: 'Heredia centro', province: 'Heredia', center: hered, ...ev(3, 15, 16) },
    { id: 'v-her4', type: 'lugar', name: 'Museo de Cultura Popular', category: 'Museo', km: 3.0, bearing: 320, tier: 'hasta2500', price: 1500, rating: 4.4, count: 31, address: 'Santa Lucía, Barva', province: 'Heredia', center: hered },
    { id: 'v-her5', type: 'evento', name: 'Feria del agricultor de Heredia', category: 'Ferias y mercados', km: 1.0, bearing: 60, tier: 'gratis', aud: ['todo', 'familias'], rating: 4.7, count: 44, address: 'Heredia centro', province: 'Heredia', center: hered, ...ev(4, 6, 12) },
    { id: 'v-ala1', type: 'lugar', name: 'Parque Juan Santamaría', category: 'Parque', km: 0.4, bearing: 190, tier: 'gratis', aud: ['todo', 'familias'], rating: 4.5, count: 60, address: 'Centro de Alajuela', province: 'Alajuela', center: alaj },
    { id: 'v-ala2', type: 'lugar', name: 'Museo Juan Santamaría', category: 'Museo', km: 0.7, bearing: 90, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.6, count: 52, address: 'Centro de Alajuela', province: 'Alajuela', center: alaj },
    { id: 'v-ala3', type: 'evento', name: 'Mercadito de artesanías', category: 'Ferias y mercados', km: 1.8, bearing: 240, tier: 'hasta2500', price: 1000, rating: 4.3, count: 19, address: 'Alajuela', province: 'Alajuela', center: alaj, ...ev(6, 9, 15) },
    { id: 'v-car1', type: 'lugar', name: 'Ruinas de Santiago Apóstol', category: 'Plaza', km: 0.3, bearing: 30, tier: 'gratis', aud: ['todo', 'familias', 'estudiantes'], rating: 4.7, count: 140, address: 'Parroquia de Cartago', province: 'Cartago', center: cart },
    { id: 'v-car2', type: 'lugar', name: 'Jardín Botánico Lankester', category: 'Parque', km: 4.5, bearing: 70, tier: 'hasta5000', price: 4500, rating: 4.8, count: 210, address: 'Paraíso de Cartago', province: 'Cartago', center: cart },
    { id: 'v-car3', type: 'evento', name: 'Peña cultural cartaginesa', category: 'Cultura', km: 1.1, bearing: 150, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 4.5, count: 11, address: 'Cartago centro', province: 'Cartago', center: cart, ...ev(7, 18, 21) },
    { id: 'v-gua1', type: 'lugar', name: 'Parque Central de Liberia', category: 'Parque', km: 0.2, bearing: 0, tier: 'gratis', rating: 4.5, count: 25, address: 'Liberia', province: 'Guanacaste', center: farC(10.6346, -85.4377) },
    { id: 'v-gua2', type: 'lugar', name: 'Playa Panamá (acceso público)', category: 'Playa', km: 0.5, bearing: 90, tier: 'gratis', rating: 4.6, count: 50, address: 'Papagayo', province: 'Guanacaste', center: farC(10.7, -85.7) },
    { id: 'v-pun1', type: 'lugar', name: 'Paseo de los Turistas', category: 'Plaza', km: 0.3, bearing: 0, tier: 'gratis', rating: 4.4, count: 38, address: 'Puntarenas centro', province: 'Puntarenas', center: farC(9.9763, -84.8384) },
    { id: 'v-pun2', type: 'lugar', name: 'Playa de Jacó (acceso público)', category: 'Playa', km: 0.4, bearing: 0, tier: 'gratis', rating: 4.3, count: 61, address: 'Jacó', province: 'Puntarenas', center: farC(9.6143, -84.6275) },
    { id: 'v-lim1', type: 'lugar', name: 'Parque Vargas', category: 'Parque', km: 0.2, bearing: 0, tier: 'gratis', rating: 4.5, count: 45, address: 'Puerto Limón', province: 'Limón', center: farC(9.9907, -83.0359) },
    { id: 'v-lim2', type: 'evento', name: 'Festival de calipso', category: 'Conciertos', km: 0.8, bearing: 40, tier: 'hasta2500', price: 2000, rating: 4.7, count: 27, address: 'Puerto Limón', province: 'Limón', center: farC(9.9907, -83.0359), ...ev(8, 17, 22) },
  ];

  // Others' pending (moderation queue "nuevas"), Ana's items, and hidden/reported ones.
  const special: Seed[] = [
    { id: 'v-feria-jose', type: 'evento', name: 'Feria de emprendedores UCR', category: 'Ferias y mercados', km: 3.6, bearing: 95, tier: 'gratis', aud: ['todo', 'estudiantes'], rating: 0, count: 0, address: 'Ciudad Universitaria, San Pedro', ...ev(11, 9, 16), status: 'pendiente', authorId: 'u-jose', author: 'José A.', created: iso(0.08), vcount: 0, views: 0, description: 'Más de 60 emprendimientos estudiantiles, música en vivo y zona de juegos para niños.' },
    { id: 'v-cine-laura', type: 'evento', name: 'Cine al aire libre Barrio Amón', category: 'Cine', km: 1.35, bearing: 28, tier: 'hasta2500', price: 1500, aud: ['todo'], rating: 0, count: 0, address: 'Barrio Amón, San José', ...ev(17, 18, 21), status: 'pendiente', authorId: 'u-laura', author: 'Laura C.', created: iso(0.2), vcount: 0, views: 0 },
    { id: 'v-huertas', type: 'evento', name: 'Taller de huertas urbanas', category: 'Talleres', km: 2.2, bearing: 290, tier: 'gratis', aud: ['todo', 'familias'], rating: 0, count: 0, address: 'Sabana Norte, San José', ...ev(8, 9, 12), status: 'pendiente', authorId: 'u-rosa', author: 'Rosa P.', created: iso(0.5), vcount: 0, views: 0 },
    { id: 'v-cuentos', type: 'evento', name: 'Cuentacuentos al aire libre', category: 'Talleres', km: 2.9, bearing: 330, tier: 'gratis', aud: ['todo', 'familias'], rating: 0, count: 0, address: 'Parque de Barva, Heredia', ...ev(9, 10, 12), status: 'pendiente', authorId: 'u-marco', author: 'Marco S.', created: iso(1), vcount: 0, views: 0, province: 'Heredia' },
    { id: 'v-feria-ana', type: 'evento', name: 'Feria de emprendedores UCR', category: 'Ferias y mercados', km: 3.2, bearing: 88, tier: 'hasta2500', price: 1000, aud: ['todo', 'estudiantes'], freeFor: ['estudiantes'], rating: 0, count: 0, address: 'Ciudad Universitaria Rodrigo Facio, San Pedro', ...ev(12, 9, 16), status: 'pendiente', authorId: ANA_ID, author: 'Ana M.', created: iso(0.1), vcount: 0, views: 0, description: 'Más de 60 emprendimientos estudiantiles, música en vivo y zona de juegos para niños.' },
    { id: 'v-cine-ana', type: 'evento', name: 'Cine al aire libre Barrio Amón', category: 'Cine', km: 1.3, bearing: 30, tier: 'hasta5000', price: 6000, aud: ['todo'], rating: 0, count: 0, address: 'Barrio Amón, San José', ...ev(-9, 18, 21), status: 'rechazada', authorId: ANA_ID, author: 'Ana M.', created: iso(10), rejection: 'costaba ₡6.000', vcount: 0, views: 0 },
    { id: 'v-este-rep', type: 'lugar', name: 'Parque del Este · mirador', category: 'Mirador', km: 4.6, bearing: 100, tier: 'gratis', aud: ['todo'], rating: 4.0, count: 12, address: 'San Rafael de Montes de Oca', status: 'oculta', authorId: 'u-mariela', author: 'Mariela R.', hiddenReason: 'Reportada 3 veces: «Ya no es gratis»' },
  ];

  const vuelticas = [...near, ...far, ...special].map((s) => mk(s, now));
  const byId = (id: string) => vuelticas.find((v) => v.id === id)!;
  // Other-user authors for read-only info.
  byId('v-ninos').authorName = 'Sofía L.';

  const ana: User = {
    id: ANA_ID, displayName: 'Ana Mora', initials: initialsOf('Ana Mora'), province: 'San José', memberSince: '2026-01-15T00:00:00.000Z', provider: 'apple',
    email: 'ana.mora@example.com', points: 172, counts: { vuelticas: 12, reviews: 8, verifications: 31 },
  };
  void levelForPoints;

  const NAMES = ['María Rodríguez', 'José Alfaro', 'Lucía Vargas', 'Daniel Quesada', 'Carolina Rojas', 'Andrés Mora', 'Valeria Núñez', 'Esteban Chaves', 'Paola Jiménez', 'Mauricio Solano', 'Daniela Brenes', 'Kevin Araya'];
  const TEXTS = [
    'Excelente para ir con niños: hubo talleres y cuentacuentos. Conviene llegar temprano.',
    'Entré con el carné de la U sin hacer fila. La música en vivo estuvo muy buena.',
    'Muy bonito y limpio. Lo mejor es que no gasté nada.',
    'Buen ambiente, aunque se llena rápido. Recomiendo ir entre semana.',
    'Fuimos en pareja y la pasamos genial. Ideal para una vuelta tranquila.',
    'Mucha gente, pero bien organizado. Los baños estaban en buen estado.',
    'Pensé que iba a cobrar y era gratis, así como lo dice la app.',
    'Aceptable, el horario cambió un poco respecto a lo publicado.',
    'Muy recomendado para ir con abuelos: hay bancas y sombra.',
    'Hay buen parqueo cerca y se puede llegar en bus.',
  ];
  const WENT: WentWith[] = ['familia', 'amigos', 'pareja', 'solo'];
  const SPENT: SpentTier[] = ['nada', 'nada', 'menos2500', 'entre2500y5000'];
  const reviews: Review[] = [];
  const ratingDist: Record<string, number[]> = {};
  let rid = 0;
  vuelticas.filter((v) => v.status === 'publicada' && v.ratingCount > 0).forEach((v, vi) => {
    // distribution scaled to rating/count
    const avg = v.ratingAvg;
    const n = v.ratingCount;
    const five = Math.round(n * Math.max(0.1, Math.min(0.95, (avg - 3) / 2)));
    const four = Math.round((n - five) * 0.6);
    const three = Math.round((n - five - four) * 0.6);
    const two = Math.round((n - five - four - three) * 0.5);
    ratingDist[v.id] = [n - five - four - three - two, two, three, four, five];
    const k = v.id === 'v-jade' ? 12 : Math.max(2, 7 - (vi % 4));
    for (let i = 0; i < k; i++) {
      const name = i === 0 && v.id === 'v-jade' ? 'María Rodríguez' : i === 1 && v.id === 'v-jade' ? 'José Alfaro' : NAMES[(vi + i * 3) % NAMES.length];
      const text = i === 0 && v.id === 'v-jade' ? TEXTS[0] : i === 1 && v.id === 'v-jade' ? TEXTS[1] : TEXTS[(vi + i) % TEXTS.length];
      reviews.push({
        id: `r-${++rid}`, vuelticaId: v.id, authorId: `u-${name.split(' ')[0].toLowerCase()}`, authorName: name, authorInitials: initialsOf(name),
        createdAt: iso(i === 0 ? 3 : i === 1 ? 7 : 3 + i * 6 + (vi % 5)), stars: v.id === 'v-jade' && i < 2 ? 4 : i % 5 === 4 ? 3 : i % 3 === 2 ? 4 : v.ratingAvg > 4.6 ? 5 : 4,
        wentWith: i === 0 ? 'familia' : i === 1 ? 'amigos' : WENT[(vi + i) % 4], spent: SPENT[(vi + i) % 4], text,
        photos: i % 4 === 1 ? [`ph:rv${rid}`] : [], usefulCount: i === 0 ? 12 : i === 1 ? 8 : (vi * 3 + i * 5) % 15, markedUsefulByMe: false,
      });
    }
  });

  const events: ReputationEvent[] = [
    { id: 'e1', userId: ANA_ID, kind: 'published', delta: 10, createdAt: iso(6) },
    { id: 'e2', userId: ANA_ID, kind: 'verified', delta: 2, createdAt: iso(3) },
    { id: 'e3', userId: ANA_ID, kind: 'reviewUseful', delta: 1, createdAt: iso(2) },
  ];

  return {
    version: DB_VERSION, seq: 1000, vuelticas, reviews, ratingDist, verifications: [], reports: [], reportDevices: [],
    saved: [
      { userId: ANA_ID, vueltica: 'v-jade', savedAt: iso(5), reminderOffsetDays: 1 },
      { userId: ANA_ID, vueltica: 'v-concierto', savedAt: iso(4), reminderOffsetDays: 1 },
      { userId: ANA_ID, vueltica: 'v-luz', savedAt: iso(3), reminderOffsetDays: 1 },
    ],
    votes: [],
    community: {
      'v-feria-jose': { votesFor: 3, votesAgainst: 0 }, 'v-cine-laura': { votesFor: 1, votesAgainst: 0 },
      'v-huertas': { votesFor: 2, votesAgainst: 0 }, 'v-cuentos': { votesFor: 0, votesAgainst: 0 },
      'v-feria-ana': { votesFor: 2, votesAgainst: 0 },
      // reported items: "for" = ocultar
      'v-este-rep': { votesFor: 0, votesAgainst: 0 }, 'v-ninos': { votesFor: 0, votesAgainst: 0 },
    },
    reportMeta: {
      'v-este-rep': { count: 3, topReason: 'noGratis', lastReportAt: iso(1) },
      'v-ninos': { count: 2, topReason: 'horario', lastReportAt: iso(3) },
    },
    events, users: [ana], currentUserId: null, settings: defaultSettings(), viewed: [], queue: [], notified: [],
  };
}
void d;
