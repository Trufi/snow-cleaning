import { ClientMsg } from '@game/client/messages';
import { ClientGraph, ClientGraphVertex } from '@game/data/clientGraph';
import { Harvester } from '@game/utils/harvester';
import { config } from '../config';
import { getNextColorIndex, random } from '../utils';

const harvesterDelay = 500;

interface FutureRoute {
  time: number;
  fromAt: number;
  vertices: ClientGraphVertex[];
  toAt: number;
}

export class Player {
  public readonly type = 'player';
  public readonly harvester: Harvester;

  private futureRoutes: FutureRoute[] = [];

  constructor(
    /**
     * id равен connectionId
     */
    public readonly id: string,

    public readonly name: string,

    private graph: ClientGraph,
  ) {
    const enabledEdges = graph.edges.filter((edge) => edge.enabled);
    const edge = enabledEdges[Math.floor(random() * enabledEdges.length)];

    this.harvester = new Harvester({
      edge,
      at: 0.5,
      speed: config.harvesterSpeed,
      color: getNextColorIndex(),
      score: 0,
    });
  }

  public addRouteFromClient(data: ClientMsg['newRoute']) {
    // TODO: проверка, что путь валидный, а также что такие индексы вообще есть

    this.futureRoutes.push({
      time: data.time,
      fromAt: data.fromAt,
      vertices: data.vertexIndices.map((index) => this.graph.vertices[index]),
      toAt: data.toAt,
    });
  }

  public update(time: number) {
    const harvesterTime = time - harvesterDelay;
    const harvesterRoute = this.harvester.getRoute();

    const startIndex = findStepInterval(harvesterTime, this.futureRoutes);
    if (startIndex === -1) {
      // Время следующего шага еще не наступило, но надо проверить мы движемся к нему или еще нет
      if (this.futureRoutes.length) {
        const nextRoute = this.futureRoutes[0];
        if (
          nextRoute.fromAt !== harvesterRoute.toAt ||
          !sameTEdges(
            getTEdge(nextRoute.vertices, 0),
            getTEdge(harvesterRoute.vertices, harvesterRoute.vertices.length - 2),
          )
        ) {
          // Если мы еще движемся не к нему, то изменим текущий путь
          const sameTEdgeIndex = findSameTEdgeInRoute(getTEdge(nextRoute.vertices, 0), harvesterRoute.vertices);
          if (sameTEdgeIndex === -1) {
            console.log(
              `Не найдена совпадающая грань текущего пути [${harvesterRoute.vertices
                .map((v) => v.index)
                .join(',')}] и следующего [${nextRoute.vertices.map((v) => v.index).join(',')}] у игрока ${this.id}`,
            );
          }

          if (harvesterRoute.edgeIndexInRoute > sameTEdgeIndex) {
            console.log(
              `Совпадающая грань текущего пути [${harvesterRoute.vertices
                .map((v) => v.index)
                .join(',')}] и следующего [${nextRoute.vertices
                .map((v) => v.index)
                .join(',')}] была уже пройдена у игрока ${this.id}, edgeIndexInRoute = ${
                harvesterRoute.edgeIndexInRoute
              } `,
            );
          }
          harvesterRoute.vertices.slice(0, sameTEdgeIndex + 2);
          harvesterRoute.toAt = nextRoute.fromAt;
        }
      }

      this.harvester.updateMoving(harvesterTime);
      return;
    }

    this.harvester.updateMoving(harvesterTime);

    const newRoute = this.futureRoutes[startIndex];
    if (!newRoute) {
      return;
    }

    const futureRoute = this.futureRoutes[startIndex + 1];

    // Если есть еще и будущий путь, то подправляем новый сразу с концом - началом будущего
    if (futureRoute) {
      const sameTEdgeIndex = findSameTEdgeInRoute(getTEdge(futureRoute.vertices, 0), newRoute.vertices);
      if (sameTEdgeIndex === -1) {
        console.log(
          `Не найдена совпадающая грань нового пути [${newRoute.vertices
            .map((v) => v.index)
            .join(',')}] и будушего [${futureRoute.vertices.map((v) => v.index).join(',')}] у игрока ${this.id}`,
        );
      }
      newRoute.vertices.slice(0, sameTEdgeIndex + 2);
      newRoute.toAt = futureRoute.fromAt;
    }

    this.futureRoutes.splice(0, startIndex + 1);

    this.harvester.setRoute(newRoute.time, newRoute.fromAt, newRoute.vertices, newRoute.toAt);
  }

  public getDebugInfo() {
    return {
      id: this.id,
      name: this.name,
      harvester: this.harvester.getDebugInfo(),
    };
  }
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
