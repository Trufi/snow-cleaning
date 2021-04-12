import { ClientGraphEdge } from '@game/data/clientGraph';
import { clamp } from '@game/utils';
import { vec2dist, vec2lerp } from '@game/utils/vec2';

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

export function normalizeMousePosition(size: Vec2, point: Vec2): Vec2 {
  return [(point[0] / size[0]) * 2 - 1, -(point[1] / size[1]) * 2 + 1];
}

/**
 * Возвращает координаты мыши относительно верхнего левого угла container
 * за вычетом ширины границ.
 */
export function getMousePosition(container: HTMLElement, clientX: number, clientY: number): number[] {
  const rect = container.getBoundingClientRect();
  return [clientX - rect.left - container.clientLeft, clientY - rect.top - container.clientTop];
}
