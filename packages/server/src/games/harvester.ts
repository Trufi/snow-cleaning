import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { clamp } from '@game/utils';
import { vec2dist, vec2lerp } from '@game/utils/vec2';
import { random } from '../utils';
import { Harvester } from './types';

export function createHarvester(playerId: string, graph: ClientGraph) {
  const vertexFrom = graph.vertices[Math.floor(random() * graph.vertices.length)];
  const edge = vertexFrom.edges[Math.floor(random() * vertexFrom.edges.length)];

  const forward = edge.a === vertexFrom;

  const harvester: Harvester = {
    playerId,
    edge,
    forward,
    speed: 100,

    edgeSegment: 0,
    passed: 0,
    edgeStartTime: 0,
    positionAtSegment: 0,
    coords: [0, 0],
  };

  return harvester;
}

export function updateHarvester(_graph: ClientGraph, harvester: Harvester, now: number) {
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
    // найти следующую цель
    const endVertex = harvester.forward ? harvester.edge.b : harvester.edge.a;

    harvester.edge = chooseNextEdge(harvester.edge, endVertex);
    harvester.edgeStartTime = now;
    harvester.edgeSegment = 0;
    harvester.passed = 0;
    harvester.forward = harvester.edge.a === endVertex;
  }
}

function chooseNextEdge(prevEdge: ClientGraphEdge, vertex: ClientGraphVertex) {
  const edgeIndex = Math.floor(random() * vertex.edges.length);
  let edge = vertex.edges[edgeIndex];

  // Если выбралась предыдущая грань, то попробуй выбрать другую
  if (vertex.edges.length > 1 && edge === prevEdge) {
    edge = vertex.edges[(edgeIndex + 1) % vertex.edges.length];
  }

  if (edge === undefined) {
    console.log('dddd hz');
  }

  return edge;
}
