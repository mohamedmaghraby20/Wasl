export type ProvinceGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export type ProvinceBoundary = {
  id: string;
  geometry: ProvinceGeometry;
};

type BoundaryData = { provinces: ProvinceBoundary[] };

const endpoint = `${import.meta.env.BASE_URL}geo/tr-provinces.json`;
const epsilon = 1e-12;
let pending: Promise<ProvinceBoundary[]> | undefined;

export function loadProvinceBoundaries(): Promise<ProvinceBoundary[]> {
  pending ??= fetch(endpoint, { credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Province boundaries are unavailable.');
      const data = (await response.json()) as BoundaryData;
      if (
        !Array.isArray(data.provinces) ||
        data.provinces.length === 0 ||
        data.provinces.some(
          (province) =>
            typeof province.id !== 'string' ||
            typeof province.geometry !== 'object' ||
            province.geometry === null ||
            !['Polygon', 'MultiPolygon'].includes(province.geometry.type),
        )
      ) {
        throw new Error('Province boundaries are malformed.');
      }
      return data.provinces;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

export function resolveProvinceCity(
  provinces: ProvinceBoundary[],
  longitude: number,
  latitude: number,
  accuracy = 0,
): string | null {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0
  ) {
    return null;
  }
  let match: string | undefined;
  for (const province of provinces) {
    // The data is generalized: 100 m is a conservative UX margin, not a certified error bound.
    if (nearBoundary(province.geometry, longitude, latitude, accuracy + 100)) return null;
    const result = classify(province.geometry, longitude, latitude);
    if (result === 'boundary') return null;
    if (result === 'inside') {
      if (match !== undefined) return null;
      match = province.id;
    }
  }
  return match ?? null;
}

function nearBoundary(
  geometry: ProvinceGeometry,
  longitude: number,
  latitude: number,
  radius: number,
): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const xScale = 111_320 * Math.cos((latitude * Math.PI) / 180);
  const yScale = 110_574;
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let index = 1; index < ring.length; index += 1) {
        const start = ring[index - 1]!;
        const end = ring[index]!;
        const x = (start[0]! - longitude) * xScale;
        const y = (start[1]! - latitude) * yScale;
        const dx = (end[0]! - start[0]!) * xScale;
        const dy = (end[1]! - start[1]!) * yScale;
        const lengthSquared = dx * dx + dy * dy;
        const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared));
        if (Math.hypot(x + projection * dx, y + projection * dy) <= radius) return true;
      }
    }
  }
  return false;
}

type Classification = 'inside' | 'outside' | 'boundary';

function classify(
  geometry: ProvinceGeometry,
  longitude: number,
  latitude: number,
): Classification {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let inside = false;
  for (const rings of polygons) {
    const outer = rings[0];
    if (!outer) continue;
    const outerResult = classifyRing(outer, longitude, latitude);
    if (outerResult === 'boundary') return 'boundary';
    if (outerResult === 'outside') continue;
    let inHole = false;
    for (const hole of rings.slice(1)) {
      const holeResult = classifyRing(hole, longitude, latitude);
      if (holeResult === 'boundary') return 'boundary';
      if (holeResult === 'inside') inHole = true;
    }
    if (!inHole) inside = true;
  }
  return inside ? 'inside' : 'outside';
}

function classifyRing(
  ring: number[][],
  longitude: number,
  latitude: number,
): Classification {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const other = ring[previous];
    if (!current || !other) continue;
    const [currentLongitude, currentLatitude] = current;
    const [otherLongitude, otherLatitude] = other;
    if (
      currentLongitude === undefined ||
      currentLatitude === undefined ||
      otherLongitude === undefined ||
      otherLatitude === undefined
    ) {
      continue;
    }
    if (onSegment(longitude, latitude, currentLongitude, currentLatitude, otherLongitude, otherLatitude)) {
      return 'boundary';
    }
    if (
      currentLatitude > latitude !== otherLatitude > latitude &&
      longitude <
        ((otherLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (otherLatitude - currentLatitude) +
          currentLongitude
    ) {
      inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}

function onSegment(
  longitude: number,
  latitude: number,
  startLongitude: number,
  startLatitude: number,
  endLongitude: number,
  endLatitude: number,
): boolean {
  const cross =
    (longitude - startLongitude) * (endLatitude - startLatitude) -
    (latitude - startLatitude) * (endLongitude - startLongitude);
  if (Math.abs(cross) > epsilon) return false;
  return (
    longitude >= Math.min(startLongitude, endLongitude) - epsilon &&
    longitude <= Math.max(startLongitude, endLongitude) + epsilon &&
    latitude >= Math.min(startLatitude, endLatitude) - epsilon &&
    latitude <= Math.max(startLatitude, endLatitude) + epsilon
  );
}
