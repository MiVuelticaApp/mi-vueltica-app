import type { Province } from './types';

/**
 * Costa Rica's cantons (INEC, División Territorial Administrativa), the same list mi-vueltica-api seeds.
 * Id = province code * 100 + canton code (101 = San José, 216 = Río Cuarto). `HttpApi` asks the API
 * (`GET /provinces?include=cantons`) and only falls back to this list offline; `MockApi` uses it directly.
 */
export interface Canton {
  id: number;
  name: string;
  province: Province;
}

const NAMES: Record<Province, string[]> = {
  'San José': [
    'San José', 'Escazú', 'Desamparados', 'Puriscal', 'Tarrazú', 'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita',
    'Vázquez de Coronado', 'Acosta', 'Tibás', 'Moravia', 'Montes de Oca', 'Turrubares', 'Dota', 'Curridabat', 'Pérez Zeledón', 'León Cortés Castro',
  ],
  Alajuela: [
    'Alajuela', 'San Ramón', 'Grecia', 'San Mateo', 'Atenas', 'Naranjo', 'Palmares', 'Poás', 'Orotina', 'San Carlos', 'Zarcero', 'Sarchí',
    'Upala', 'Los Chiles', 'Guatuso', 'Río Cuarto',
  ],
  Cartago: ['Cartago', 'Paraíso', 'La Unión', 'Jiménez', 'Turrialba', 'Alvarado', 'Oreamuno', 'El Guarco'],
  Heredia: ['Heredia', 'Barva', 'Santo Domingo', 'Santa Bárbara', 'San Rafael', 'San Isidro', 'Belén', 'Flores', 'San Pablo', 'Sarapiquí'],
  Guanacaste: ['Liberia', 'Nicoya', 'Santa Cruz', 'Bagaces', 'Carrillo', 'Cañas', 'Abangares', 'Tilarán', 'Nandayure', 'La Cruz', 'Hojancha'],
  Puntarenas: [
    'Puntarenas', 'Esparza', 'Buenos Aires', 'Montes de Oro', 'Osa', 'Quepos', 'Golfito', 'Coto Brus', 'Parrita', 'Corredores', 'Garabito',
    'Monteverde', 'Puerto Jiménez',
  ],
  Limón: ['Limón', 'Pococí', 'Siquirres', 'Talamanca', 'Matina', 'Guácimo'],
};

export const PROVINCE_ORDER: Province[] = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

export const CANTONS: Canton[] = PROVINCE_ORDER.flatMap((province, p) =>
  NAMES[province].map((name, i) => ({ id: (p + 1) * 100 + i + 1, name, province })),
);

export const cantonsOf = (province: Province): Canton[] => CANTONS.filter((c) => c.province === province);
export const cantonById = (id: number | null | undefined): Canton | undefined => (id ? CANTONS.find((c) => c.id === id) : undefined);
