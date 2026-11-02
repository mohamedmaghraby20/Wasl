import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveProvinceCity,
  type ProvinceBoundary,
  type ProvinceGeometry,
} from './province-boundaries';

const bundled = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'public/geo/tr-provinces.json'), 'utf8'),
) as { provinces: ProvinceBoundary[] };

const supportedCityIds = `adana adiyaman afyonkarahisar agri aksaray amasya ankara antalya ardahan artvin aydin balikesir bartin batman bayburt bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir duzce edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay igdir isparta istanbul izmir kahramanmaras karabuk karaman kars kastamonu kayseri kilis kirikkale kirklareli kirsehir kocaeli konya kutahya malatya manisa mardin mersin mugla mus nevsehir nigde ordu osmaniye rize sakarya samsun sanliurfa siirt sinop sivas sirnak tekirdag tokat trabzon tunceli usak van yalova yozgat zonguldak`.split(
  ' ',
);

function polygon(...rings: [number, number][][]): ProvinceGeometry {
  return { type: 'Polygon', coordinates: rings };
}

function square(
  west: number,
  south: number,
  east: number,
  north: number,
): [number, number][] {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

function boundary(id: string, geometry: ProvinceGeometry): ProvinceBoundary {
  return { id, geometry };
}

describe('bundled province boundaries', () => {
  it('maps one distinct boundary to every supported Wasl city id', () => {
    const ids = bundled.provinces.map((province) => province.id).sort();
    expect(ids).toEqual([...supportedCityIds].sort());
    expect(new Set(ids).size).toBe(81);
  });

  it('resolves representative city centres to their province', () => {
    const cases: [string, number, number][] = [
      ['istanbul', 28.9784, 41.0082],
      ['ankara', 32.8597, 39.9334],
      ['izmir', 27.1428, 38.4237],
      ['antalya', 30.7133, 36.8969],
      ['edirne', 26.5557, 41.6771],
      ['hakkari', 43.74, 37.5744],
      ['duzce', 31.16, 40.8389],
      ['istanbul', 28.7519, 41.2753],
      ['canakkale', 25.9, 40.2],
      ['canakkale', 26.071, 39.835],
    ];
    for (const [cityId, longitude, latitude] of cases) {
      expect(resolveProvinceCity(bundled.provinces, longitude, latitude)).toBe(cityId);
    }
  });

  it('returns no city instead of a nearest match outside Türkiye or over water', () => {
    const cases: [number, number][] = [
      [23.7275, 37.9838],
      [23.3219, 42.6977],
      [33.3823, 35.1856],
      [28.2278, 36.4349],
      [41.6367, 41.6168],
      [37.1612, 36.2021],
      [35, 43],
      [28, 40.7],
      [29.035, 41.05],
      [27.1, 38.45],
    ];
    for (const [longitude, latitude] of cases) {
      expect(resolveProvinceCity(bundled.provinces, longitude, latitude)).toBeNull();
    }
  });

  it('rejects non-finite and out-of-range coordinates without loading geometry', () => {
    const invalid: [number, number][] = [
      [Number.NaN, 39],
      [32, Number.POSITIVE_INFINITY],
      [181, 39],
      [-181, 39],
      [32, 91],
      [32, -91],
    ];
    for (const [longitude, latitude] of invalid) {
      expect(resolveProvinceCity([], longitude, latitude)).toBeNull();
    }
  });
});

describe('province geometry resolution', () => {
  it('excludes interior holes from a province', () => {
    const geometry = polygon(square(30, 39, 33, 41), square(31, 39.5, 32, 40.5));
    const provinces = [boundary('ring', geometry)];
    expect(resolveProvinceCity(provinces, 30.5, 39.2)).toBe('ring');
    expect(resolveProvinceCity(provinces, 31.5, 40)).toBeNull();
  });

  it('treats multipolygon parts as one province and does not fill the sea between them', () => {
    const geometry: ProvinceGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(26, 39, 27, 40)], [square(28, 39, 29, 40)]],
    };
    const provinces = [boundary('islands', geometry)];
    expect(resolveProvinceCity(provinces, 26.5, 39.5)).toBe('islands');
    expect(resolveProvinceCity(provinces, 28.5, 39.5)).toBe('islands');
    expect(resolveProvinceCity(provinces, 27.5, 39.5)).toBeNull();
  });

  it('leaves boundary hits and overlapping provinces unresolved', () => {
    expect(
      resolveProvinceCity([boundary('edge', polygon(square(30, 39, 33, 41)))], 31.5, 39),
    ).toBeNull();
    expect(
      resolveProvinceCity(
        [boundary('first', polygon(square(30, 39, 33, 41))), boundary('second', polygon(square(30, 39, 33, 41)))],
        31.5,
        40,
      ),
    ).toBeNull();
  });

  it('still includes an island polygon within another polygon’s hole', () => {
    const provinces = [boundary('islands', {
      type: 'MultiPolygon',
      coordinates: [
        [square(30, 38, 34, 42), square(31, 39, 33, 41)],
        [square(31.2, 39.2, 32.8, 40.8)],
      ],
    })];
    expect(resolveProvinceCity(provinces, 32, 40)).toBe('islands');
  });
});
