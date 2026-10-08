export type Edition = 'domestic' | 'international';

export type ContinentId =
  | 'asia'
  | 'europe'
  | 'africa'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'antarctica';

export interface ContinentRegion {
  id: ContinentId;
  name: string;
  nameEn: string;
  emoji: string;
  /** 飞行目标：经度、纬度、高度（米） */
  camera: { lon: number; lat: number; height: number };
  /** 矩形范围 [west, south, east, north] */
  bounds: [number, number, number, number];
}

export const CONTINENTS: ContinentRegion[] = [
  {
    id: 'asia',
    name: '亚洲',
    nameEn: 'Asia',
    emoji: '🏯',
    camera: { lon: 95, lat: 30, height: 8_000_000 },
    bounds: [25, -10, 150, 75],
  },
  {
    id: 'europe',
    name: '欧洲',
    nameEn: 'Europe',
    emoji: '🏰',
    camera: { lon: 15, lat: 50, height: 5_000_000 },
    bounds: [-25, 35, 60, 72],
  },
  {
    id: 'africa',
    name: '非洲',
    nameEn: 'Africa',
    emoji: '🦁',
    camera: { lon: 20, lat: 5, height: 7_000_000 },
    bounds: [-20, -35, 55, 38],
  },
  {
    id: 'north-america',
    name: '北美洲',
    nameEn: 'North America',
    emoji: '🗽',
    camera: { lon: -100, lat: 45, height: 7_000_000 },
    bounds: [-170, 15, -50, 75],
  },
  {
    id: 'south-america',
    name: '南美洲',
    nameEn: 'South America',
    emoji: '🌴',
    camera: { lon: -60, lat: -15, height: 6_000_000 },
    bounds: [-82, -56, -34, 13],
  },
  {
    id: 'oceania',
    name: '大洋洲',
    nameEn: 'Oceania',
    emoji: '🦘',
    camera: { lon: 135, lat: -25, height: 6_000_000 },
    bounds: [110, -50, 180, 10],
  },
  {
    id: 'antarctica',
    name: '南极洲',
    nameEn: 'Antarctica',
    emoji: '🐧',
    camera: { lon: 0, lat: -80, height: 4_000_000 },
    bounds: [-180, -90, 180, -60],
  },
];

/** 国内版默认视角：中国中心 */
export const DOMESTIC_CAMERA = { lon: 104, lat: 35, height: 6_500_000 };

/** 国外版全球视角 */
export const WORLD_CAMERA = { lon: 0, lat: 20, height: 18_000_000 };

export function getContinentById(id: ContinentId): ContinentRegion {
  const found = CONTINENTS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown continent: ${id}`);
  return found;
}
