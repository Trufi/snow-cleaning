import { ClientMsg } from '@game/client/messages';
import { Harvester } from '@game/utils/harvester';
import { SnowClientGraph } from '@game/utils/types';
import { Route } from '@trufi/roads';
import { config } from '../config';
import { getNextColorIndex, getPlayerStartEdge } from '../utils';

const harvesterDelay = 500;

interface FutureRoute {
  time: number;
  route: Route;
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

    private graph: SnowClientGraph,
  ) {
    const edge = getPlayerStartEdge(graph);

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

    const route: Route = {
      fromAt: data.fromAt,
      toAt: data.toAt,
      edges: data.edges.map(({ index, forward }) => ({ edge: this.graph.edges[index], forward })),
    };

    this.futureRoutes.push({
      time: data.time,
      route,
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
          nextRoute.route.fromAt !== harvesterRoute.toAt ||
          nextRoute.route.edges[0].edge !== harvesterRoute.edges[harvesterRoute.edges.length - 1].edge
        ) {
          // Если мы еще движемся не к нему, то изменим текущий путь
          const sameEdgeIndex = harvesterRoute.edges.findIndex(({ edge }) => edge === nextRoute.route.edges[0].edge);
          if (sameEdgeIndex === -1) {
            console.log(
              `Не найдена совпадающая грань текущего пути [${harvesterRoute.edges
                .map(({ edge }) => edge.index)
                .join(',')}] и следующего [${nextRoute.route.edges.map(({ edge }) => edge.index).join(',')}] у игрока ${
                this.id
              }`,
            );
          }

          // TODO: решить что делать с edgeIndexInRoute
          const edgeIndexInRoute = (this.harvester.point as any).edgeIndexInRoute;
          if (edgeIndexInRoute > sameEdgeIndex) {
            console.log(
              `Совпадающая грань текущего пути [${harvesterRoute.edges
                .map(({ edge }) => edge.index)
                .join(',')}] и следующего [${nextRoute.route.edges
                .map(({ edge }) => edge.index)
                .join(',')}] была уже пройдена у игрока ${this.id}, edgeIndexInRoute = ${edgeIndexInRoute} `,
            );
          }
          harvesterRoute.edges.slice(0, sameEdgeIndex + 1); // TODO: возможно +0
          harvesterRoute.toAt = nextRoute.route.fromAt;
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
      const sameEdgeIndex = newRoute.route.edges.findIndex(({ edge }) => edge === futureRoute.route.edges[0].edge);
      if (sameEdgeIndex === -1) {
        console.log(
          `Не найдена совпадающая грань нового пути [${newRoute.route.edges
            .map(({ edge }) => edge.index)
            .join(',')}] и будущего [${futureRoute.route.edges.map(({ edge }) => edge.index).join(',')}] у игрока ${
            this.id
          }`,
        );
      }
      harvesterRoute.edges.slice(0, sameEdgeIndex + 1); // TODO: возможно +0
      harvesterRoute.toAt = futureRoute.route.fromAt;
    }

    this.futureRoutes.splice(0, startIndex + 1);

    this.harvester.setRoute(newRoute.time, newRoute.route);
  }

  public getDebugInfo() {
    return {
      id: this.id,
      name: this.name,
      harvester: this.harvester.getDebugInfo(),
    };
  }
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
