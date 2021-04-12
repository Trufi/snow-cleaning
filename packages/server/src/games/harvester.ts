import { ClientGraph, ClientGraphVertex } from '@game/data/clientGraph';
import { clamp } from '@game/utils';
import { findEdgeFromVertexToVertex } from '@game/utils/graph';
import { GamePlayer } from '../types';
import { random } from '../utils';
import { Harvester } from './types';

export function createHarvester(playerId: string, graph: ClientGraph) {
  const vertexFrom = graph.vertices[Math.floor(random() * graph.vertices.length)];

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

    speed: 100,
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
  const maybeEdge = findEdgeFromVertexToVertex(vertices[0], vertices[1]);
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

export function updateHarvester(_graph: ClientGraph, player: GamePlayer, now: number) {
  const { harvester } = player;
  const { position } = harvester;

  const passedDistanceInEdge = harvester.speed * (now - harvester.edgeStartTime);

  harvester.edgeStartTime = now;
  const dx = passedDistanceInEdge / position.edge.length;

  const isFinalRouteEdge = harvester.edgeIndexInRoute === harvester.route.vertices.length - 2;
  if (isFinalRouteEdge && position.at === harvester.route.toAt) {
    return;
  }

  // Обновляем загрязнение дороги и начисляем очки
  const nextPollution = clamp(position.edge.pollution - position.edge.pollution * dx, 0, 1);
  player.score += ((position.edge.pollution - nextPollution) * position.edge.length) / 1000;
  position.edge.pollution = nextPollution;

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
      const maybeEdge = findEdgeFromVertexToVertex(
        harvester.route.vertices[harvester.edgeIndexInRoute],
        harvester.route.vertices[harvester.edgeIndexInRoute + 1],
      );
      if (maybeEdge) {
        position.at = maybeEdge.forward ? 0 : 1;
        position.edge = maybeEdge.edge;
        harvester.forward = maybeEdge.forward;
      } else {
        console.log(`Не найдена следующая кривая пути игрока ${harvester.playerId}`);
      }
    }
  }
}
