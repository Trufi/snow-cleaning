import { ClientGraph, ClientGraphVertex } from '@game/data/clientGraph';
// import { random } from '../utils';
import { Harvester } from './types';

export function createHarvester(playerId: string, graph: ClientGraph) {
  const vertexFrom = graph.vertices[2487]; // Math.floor(random() * graph.vertices.length)];

  const edge = vertexFrom.edges[0];
  const forward = edge.a === vertexFrom;

  const harvester: Harvester = {
    playerId,

    route: {
      fromAt: 0,
      toAt: 0,
      vertices: forward ? [edge.a, edge.b] : [edge.b, edge.a],
    },
    edgeIndexInRoute: 0,

    position: {
      edge,
      at: 0,
    },

    forward,
    passed: 0,
    edgeStartTime: 0,

    speed: 10,
  };

  return harvester;
}

export function setHarvesterRoute(
  harvester: Harvester,
  now: number,
  fromAt: number,
  vertices: ClientGraphVertex[],
  toAt: number,
) {
  harvester.route = {
    fromAt,
    vertices,
    toAt,
  };

  harvester.position.at = fromAt;
  const maybeEdge = findEdge(vertices[0], vertices[1]);
  if (!maybeEdge) {
    console.log(`Не найдена кривая пути у игрока ${harvester.playerId}`);
    return;
  }
  harvester.position.edge = maybeEdge.edge;

  harvester.passed = 0;
  harvester.edgeStartTime = now;

  harvester.forward = maybeEdge.forward;
  harvester.edgeIndexInRoute = 0;
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
  const { position } = harvester;

  const passedDistanceInEdge = harvester.speed * (now - harvester.edgeStartTime);
  const dx = passedDistanceInEdge / position.edge.length;

  const isFinalRouteEdge = harvester.edgeIndexInRoute === harvester.route.vertices.length - 2;
  if (isFinalRouteEdge && position.at === harvester.route.toAt) {
    return;
  }

  let endAt: number;
  if (isFinalRouteEdge) {
    endAt = harvester.route.toAt;
  } else {
    endAt = harvester.forward ? 1 : 0;
  }

  let remain: number;
  if (harvester.forward) {
    position.at = position.at + dx;
    remain = endAt - position.at;
  } else {
    position.at = position.at - dx;
    remain = position.at - endAt;
  }

  if (remain < 0) {
    if (isFinalRouteEdge) {
      position.at = harvester.route.toAt;
    } else {
      harvester.edgeIndexInRoute++;
      const maybeEdge = findEdge(
        harvester.route.vertices[harvester.edgeIndexInRoute],
        harvester.route.vertices[harvester.edgeIndexInRoute + 1],
      );
      console.log(
        `passed ${position.edge.length} by ${now - harvester.edgeStartTime}, speed: ${
          (now - harvester.edgeStartTime) / position.edge.length
        }`,
      );
      if (maybeEdge) {
        position.at = maybeEdge.forward ? 0 : 1;
        position.edge = maybeEdge.edge;
        harvester.forward = maybeEdge.forward;
        harvester.edgeStartTime = now;
      } else {
        console.log(`Не найдена следующая кривая пути игрока ${harvester.playerId}`);
      }
    }
  }

  console.log(harvester.forward, position.edge.index, position.at, endAt, remain);
}
