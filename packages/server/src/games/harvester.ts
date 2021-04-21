import { ClientGraph, ClientGraphVertex } from '@game/data/clientGraph';
import { clamp } from '@game/utils';
import { findEdgeFromVertexToVertex } from '@game/utils/graph';
import { random } from '../utils';
import { Harvester, HarvesterFutureRoute } from './types';
import { config } from '../config';

const harvesterDelay = 500;

export function createHarvester(playerId: string, graph: ClientGraph) {
  const enabledEdges = graph.edges.filter((edge) => edge.enabled);
  const edge = enabledEdges[Math.floor(random() * enabledEdges.length)];

  const harvester: Harvester = {
    playerId,

    futureRoutes: [],

    score: 0,

    route: {
      time: 0,
      fromAt: 0.5,
      toAt: 0.5,
      vertices: [edge.a, edge.b],
    },
    edgeIndexInRoute: 0,

    position: {
      edge,
      at: 0.5,
    },

    forward: true,
    lastUpdateTime: 0,

    speed: config.harvesterSpeed,
  };

  return harvester;
}

export function addHarvesterRouteFromClient(
  harvester: Harvester,
  time: number,
  fromAt: number,
  vertices: ClientGraphVertex[],
  toAt: number,
) {
  harvester.futureRoutes.push({
    time,
    fromAt,
    vertices,
    toAt,
  });
}

export function updateHarvester(harvester: Harvester, now: number) {
  const harvesterTime = now - harvesterDelay;

  const startIndex = findStepInterval(harvesterTime, harvester.futureRoutes);
  if (startIndex === -1) {
    // Время следующего шага еще не наступило, но надо проверить мы движемся к нему или еще нет
    if (harvester.futureRoutes.length) {
      const nextRoute = harvester.futureRoutes[0];
      if (
        nextRoute.fromAt !== harvester.route.toAt ||
        !sameTEdges(
          getTEdge(nextRoute.vertices, 0),
          getTEdge(harvester.route.vertices, harvester.route.vertices.length - 2),
        )
      ) {
        // Если мы еще движемся не к нему, то изменим текущий путь
        const sameTEdgeIndex = findSameTEdgeInRoute(getTEdge(nextRoute.vertices, 0), harvester.route.vertices);
        if (sameTEdgeIndex === -1) {
          console.log(
            `Не найдена совпадающая грань текущего пути [${harvester.route.vertices
              .map((v) => v.index)
              .join(',')}] и следующего [${nextRoute.vertices.map((v) => v.index).join(',')}] у игрока ${
              harvester.playerId
            }`,
          );
        }

        if (harvester.edgeIndexInRoute > sameTEdgeIndex) {
          console.log(
            `Совпадающая грань текущего пути [${harvester.route.vertices
              .map((v) => v.index)
              .join(',')}] и следующего [${nextRoute.vertices
              .map((v) => v.index)
              .join(',')}] была уже пройдена у игрока ${harvester.playerId}, edgeIndexInRoute = ${
              harvester.edgeIndexInRoute
            } `,
          );
        }
        harvester.route.vertices.slice(0, sameTEdgeIndex + 2);
        harvester.route.toAt = nextRoute.fromAt;
      }
    }

    updateHarvesterMove(harvester, harvesterTime);
    return;
  }

  updateHarvesterMove(harvester, harvesterTime);

  const newRoute = harvester.futureRoutes[startIndex];
  if (!newRoute) {
    return;
  }

  const futureRoute = harvester.futureRoutes[startIndex + 1];

  // Если есть еще и будущий путь, то подправляем новый сразу с концом - началом будущего
  if (futureRoute) {
    const sameTEdgeIndex = findSameTEdgeInRoute(getTEdge(futureRoute.vertices, 0), newRoute.vertices);
    if (sameTEdgeIndex === -1) {
      console.log(
        `Не найдена совпадающая грань нового пути [${newRoute.vertices
          .map((v) => v.index)
          .join(',')}] и будушего [${futureRoute.vertices.map((v) => v.index).join(',')}] у игрока ${
          harvester.playerId
        }`,
      );
    }
    newRoute.vertices.slice(0, sameTEdgeIndex + 2);
    newRoute.toAt = futureRoute.fromAt;
  }

  const maybeNewRoute: HarvesterFutureRoute = {
    time: newRoute.time,
    vertices: newRoute.vertices,
    fromAt: newRoute.fromAt,
    toAt: newRoute.toAt,
  };

  harvester.futureRoutes.splice(0, startIndex + 1);

  harvester.position.at = maybeNewRoute.fromAt;

  const maybeEdge = findEdgeFromVertexToVertex(maybeNewRoute.vertices[0], maybeNewRoute.vertices[1]);
  if (!maybeEdge) {
    console.log(`tttНе найдена кривая пути у игрока ${harvester.playerId}, ${maybeNewRoute.vertices.length}`);
    return;
  }

  harvester.position.edge = maybeEdge.edge;

  harvester.lastUpdateTime = maybeNewRoute.time;

  harvester.forward = maybeEdge.forward;
  harvester.edgeIndexInRoute = 0;
  harvester.route = maybeNewRoute;
}

interface TEdge {
  a: ClientGraphVertex;
  b: ClientGraphVertex;
}

function getTEdge(vertices: ClientGraphVertex[], index: number) {
  return { a: vertices[index], b: vertices[index + 1] };
}

function sameTEdges(edgeA: TEdge, edgeB: TEdge) {
  return (edgeA.a === edgeB.a && edgeA.b === edgeB.b) || (edgeA.b === edgeB.a && edgeA.a === edgeB.b);
}

function findSameTEdgeInRoute(edge: TEdge, vertices: ClientGraphVertex[]) {
  for (let i = 0; i < vertices.length - 1; i++) {
    const compare = getTEdge(vertices, i);
    if (sameTEdges(edge, compare)) {
      return i;
    }
  }
  return -1;
}

function findStepInterval(time: number, steps: Array<{ time: number }>): number {
  // Считаем, что массив отсортирован по возрастанию time
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.time <= time) {
      return i;
    }
  }
  return -1;
}

function updateHarvesterMove(harvester: Harvester, now: number) {
  const { position } = harvester;

  const passedDistanceInEdge = harvester.speed * (now - harvester.lastUpdateTime);

  harvester.lastUpdateTime = now;
  const dx = position.edge.length ? passedDistanceInEdge / position.edge.length : 1;

  const isFinalRouteEdge = harvester.edgeIndexInRoute === harvester.route.vertices.length - 2;
  if (isFinalRouteEdge && position.at === harvester.route.toAt) {
    return;
  }

  if (position.edge.enabled) {
    // Обновляем загрязнение дороги и начисляем очки
    const nextPollution = clamp(position.edge.pollution - position.edge.pollution * dx, 0, 1);
    harvester.score += ((position.edge.pollution - nextPollution) * position.edge.length) / 1000;
    position.edge.pollution = nextPollution;
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
