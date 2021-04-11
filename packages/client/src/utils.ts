import { ClientGraphEdge } from '@game/data/clientGraph';
import { vec2dist, vec2lerp } from '@game/utils/vec2';

export function clamp(value: number, min: number, max: number): number {
  value = Math.max(value, min);
  value = Math.min(value, max);
  return value;
}

export function sign(x: number) {
  x = +x; // convert to a number
  if (x === 0 || Number.isNaN(x)) {
    return x; // 0, -0 or NaN
  }
  return x > 0 ? 1 : -1;
}

export function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians / Math.PI) * 180;
}

const worldSize = 2 ** 32;

export function projectGeoToMap(geoPoint: number[]): number[] {
  const worldHalf = worldSize / 2;
  const sin = Math.sin(degToRad(geoPoint[1]));

  const x = (geoPoint[0] * worldSize) / 360;
  const y = (Math.log((1 + sin) / (1 - sin)) * worldSize) / (4 * Math.PI);

  return [clamp(x, -worldHalf, worldHalf), clamp(y, -worldHalf, worldHalf), 0];
}

export function projectMapToGeo(mapPoint: number[]): number[] {
  const geoPoint = [0, 0];

  geoPoint[0] = (mapPoint[0] * 360) / worldSize;

  const latFactor = (-2 * Math.PI) / worldSize;
  geoPoint[1] = 90.0 - 2 * radToDeg(Math.atan(Math.exp(mapPoint[1] * latFactor)));

  return geoPoint;
}

export function createRandomFunction(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function getSegment(edge: ClientGraphEdge, forward: boolean, at: number) {
  const { length, geometry } = edge;
  const distance = length * at;

  let passed = 0;

  for (let i = 0; i < geometry.length - 1; i++) {
    const segmentA = forward ? geometry[i] : geometry[geometry.length - 1 - i];
    const segmentB = forward ? geometry[i + 1] : geometry[geometry.length - 1 - (i + 1)];

    const segmentLength = vec2dist(segmentA, segmentB);
    const coords = [0, 0];
    const directedPositionAtSegment = clamp((distance - passed) / segmentLength, 0, 1);
    vec2lerp(coords, segmentA, segmentB, directedPositionAtSegment);
    if (passed + segmentLength < distance) {
      return {
        segmentIndex: i,
        positionAtSegment: forward ? directedPositionAtSegment : 1 - directedPositionAtSegment,
        coords,
      };
    }
    passed += segmentLength;
  }

  return {
    segmentIndex: 0,
    positionAtSegment: 0,
    coords: [0, 0],
  };
}

export function getAtFromSegment(edge: ClientGraphEdge, positionAtSegment: number, segmentIndex: number) {
  const { length, geometry } = edge;

  let passed = 0;

  for (let i = 0; i < segmentIndex; i++) {
    passed += vec2dist(geometry[i], geometry[i + 1]);
  }

  passed += vec2dist(geometry[segmentIndex], geometry[segmentIndex + 1]) * positionAtSegment;

  return passed / length;
}
