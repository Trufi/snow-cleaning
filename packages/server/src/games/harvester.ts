import { ClientGraph, ClientGraphVertex } from '@game/data/clientGraph';
import { clamp } from '@game/utils';
import { vec2dist, vec2lerp } from '@game/utils/vec2';
import { random } from '../utils';
import { Harvester } from './types';

export function createHarvester(playerId: string, graph: ClientGraph) {
  const vertexFrom = graph.vertices[Math.floor(random() * graph.vertices.length)];

  const harvester: Harvester = {
    playerId,

    route: [vertexFrom],
    edgeIndexInRoute: 0,
    edge: undefined,
    forward: false,

    edgeSegment: 0,
    passed: 0,
    edgeStartTime: 0,
    positionAtSegment: 0,
    coords: [vertexFrom.coords[0], vertexFrom.coords[1]],

    speed: 100,
  };

  return harvester;
}

export function setHarvesterRoute(harvester: Harvester, now: number, route: ClientGraphVertex[]) {
  harvester.route = route;
  harvester.edge = undefined;
  harvester.edgeIndexInRoute = 0;
  harvester.edgeSegment = 0;
  harvester.passed = 0;
  harvester.edgeStartTime = now;

  if (route.length > 2) {
    const maybeFoundEdge = findEdge(route[0], route[1]);

    if (maybeFoundEdge) {
      harvester.edge = maybeFoundEdge.edge;
      harvester.forward = maybeFoundEdge.forward;
    }
  }
}

function findEdge(fromVertex: ClientGraphVertex, toVertex: ClientGraphVertex) {
  for (const edge of fromVertex.edges) {
    if (edge.a === fromVertex && edge.b === toVertex) {
      return {
        edge,
        forward: true,
      };
    }

    if (edge.a === toVertex && edge.b === fromVertex) {
      return {
        edge,
        forward: false,
      };
    }
  }
}

export function updateHarvester(_graph: ClientGraph, harvester: Harvester, now: number) {
  // Харвестер стоит на месте и ждет выбора пути
  if (!harvester.edge) {
    return;
  }

  const geometry = harvester.edge.geometry;

  const distance = harvester.speed * (now - harvester.edgeStartTime);

  let passed = harvester.passed;
  let ended = true;

  for (let i = harvester.edgeSegment; i < geometry.length - 1; i++) {
    const segmentA = harvester.forward ? geometry[i] : geometry[geometry.length - 1 - i];
    const segmentB = harvester.forward ? geometry[i + 1] : geometry[geometry.length - 1 - (i + 1)];

    const length = vec2dist(segmentB, segmentA);
    if (distance < passed + length) {
      harvester.edgeSegment = i;
      harvester.passed = passed;
      harvester.positionAtSegment = clamp((distance - passed) / length, 0, 1);
      harvester.coords = vec2lerp(harvester.coords, segmentA, segmentB, harvester.positionAtSegment);
      ended = false;
      break;
    }
    passed += length;
  }

  if (ended) {
    harvester.edgeIndexInRoute++;
    harvester.edge = undefined;

    if (harvester.edgeIndexInRoute + 1 < harvester.route.length) {
      const maybeFoundEdge = findEdge(
        harvester.route[harvester.edgeIndexInRoute],
        harvester.route[harvester.edgeIndexInRoute + 1],
      );
      if (maybeFoundEdge) {
        harvester.edge = maybeFoundEdge.edge;
        harvester.forward = maybeFoundEdge.forward;

        harvester.edgeStartTime = now;
        harvester.edgeSegment = 0;
        harvester.passed = 0;
      }
    }
  }
}
