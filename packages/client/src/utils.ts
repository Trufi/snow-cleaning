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

export function getSegment(edge: ClientGraphEdge, at: number) {
  const { length, geometry } = edge;
  const distance = length * at;

  let passed = 0;

  for (let i = 0; i < geometry.length - 1; i++) {
    const segmentLength = vec2dist(geometry[i], geometry[i + 1]);
    if (passed + segmentLength >= distance) {
      const coords = [0, 0];

      // Иногда из данных может прийти сегмент нулевой длины
      const positionAtSegment = segmentLength > 0 ? clamp((distance - passed) / segmentLength, 0, 1) : 0;

      vec2lerp(coords, geometry[i], geometry[i + 1], positionAtSegment);
      return {
        segmentIndex: i,
        positionAtSegment,
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

export function getCircleIcon(color: string, radius: number, color2 = '#000', radius2 = 0): string {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${
    radius * 2
  } ${radius * 2}">
      <circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/>
      <circle fill="${color2}" cx="${radius}" cy="${radius}" r="${radius2}"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(icon)}`;
}
export function throttle(fn: (...args: any[]) => void, time: number) {
  let lock: any;
  let savedArgs: any;

  function later() {
    // reset lock and call if queued
    lock = false;
    if (savedArgs) {
      wrapperFn(...savedArgs);
      savedArgs = false;
    }
  }

  function wrapperFn(...args: any[]) {
    if (lock) {
      // called too soon, queue to call later
      savedArgs = args;
    } else {
      // call and lock until later
      fn(...args);
      setTimeout(later, time);
      lock = true;
    }
  }

  return wrapperFn;
}
