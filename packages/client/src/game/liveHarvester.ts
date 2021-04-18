import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { PlayerData } from '@game/server/messages';
import { clamp } from '@game/utils';
import { findEdgeFromVertexToVertex } from '@game/utils/graph';
import { getSegment } from '../utils';

export interface PlayerHarvesterPosition {
  edge: ClientGraphEdge;
  at: number;
}

export interface PlayerHarvesterRoute {
  fromAt: number;
  vertices: ClientGraphVertex[];
  toAt: number;
}

export class PlayerHarvester {
  public type = 'player' as const;

  private score = 0;

  private edgeIndexInRoute = 0;
  private forward = true;
  private lastUpdateTime = 0;
  private speed: number;

  private position: PlayerHarvesterPosition;
  private route: PlayerHarvesterRoute;

  constructor(private graph: ClientGraph, data: PlayerData['harvester']) {
    const edge = this.graph.edges[data.edgeIndex];

    this.route = {
      fromAt: data.at,
      toAt: data.at,
      vertices: [edge.a, edge.b],
    };

    this.speed = data.speed;
    this.position = { edge, at: data.at };
  }

  public setRoute(now: number, fromAt: number, vertices: ClientGraphVertex[], toAt: number) {
    this.route = {
      fromAt,
      vertices,
      toAt,
    };

    this.position.at = fromAt;
    const maybeEdge = findEdgeFromVertexToVertex(vertices[0], vertices[1]);
    if (!maybeEdge) {
      console.log(`Не найдена кривая пути`);
      return;
    }
    this.position.edge = maybeEdge.edge;

    this.lastUpdateTime = now;

    this.forward = maybeEdge.forward;
    this.edgeIndexInRoute = 0;
  }

  public getScore() {
    return this.score;
  }

  public getCoords() {
    const { coords } = getSegment(this.position.edge, this.position.at);
    return coords;
  }

  public getPosition() {
    return this.position;
  }

  public update(now: number) {
    const { position } = this;

    const passedDistanceInEdge = this.speed * (now - this.lastUpdateTime);

    this.lastUpdateTime = now;
    const dx = passedDistanceInEdge / position.edge.length;

    const isFinalRouteEdge = this.edgeIndexInRoute === this.route.vertices.length - 2;
    if (isFinalRouteEdge && position.at === this.route.toAt) {
      return;
    }

    // Обновляем загрязнение дороги и начисляем очки
    const nextPollution = clamp(position.edge.pollution - position.edge.pollution * dx, 0, 1);
    this.score += ((position.edge.pollution - nextPollution) * position.edge.length) / 1000;
    position.edge.pollution = nextPollution;

    let endAt: number;
    if (isFinalRouteEdge) {
      endAt = this.route.toAt;
    } else {
      endAt = this.forward ? 1 : 0;
    }

    let remain: number;
    if (this.forward) {
      position.at = position.at + dx;
      remain = endAt - position.at;
    } else {
      position.at = position.at - dx;
      remain = position.at - endAt;
    }

    if (remain < 0) {
      if (isFinalRouteEdge) {
        position.at = this.route.toAt;
      } else {
        this.edgeIndexInRoute++;
        const maybeEdge = findEdgeFromVertexToVertex(
          this.route.vertices[this.edgeIndexInRoute],
          this.route.vertices[this.edgeIndexInRoute + 1],
        );
        if (maybeEdge) {
          position.at = maybeEdge.forward ? 0 : 1;
          position.edge = maybeEdge.edge;
          this.forward = maybeEdge.forward;
        } else {
          console.log(`Не найдена следующая кривая пути}`);
        }
      }
    }
  }
}
