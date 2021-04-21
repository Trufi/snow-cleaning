import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { clamp } from '.';
import { findEdgeFromVertexToVertex, getSegment } from './graph';

export interface HarvesterPosition {
  edge: ClientGraphEdge;
  at: number;
}

export interface HarvesterRoute {
  fromAt: number;
  vertices: ClientGraphVertex[];
  toAt: number;
}

export type HarvesterType = 'player' | 'bot';

export interface HarversterInitialData {
  type: HarvesterType;
  edge: ClientGraphEdge;
  at: number;
  speed: number;
}

export class Harvester {
  public readonly type: HarvesterType;

  private score = 0;

  private edgeIndexInRoute = 0;
  private forward = true;
  private lastUpdateTime = 0;
  private speed: number;

  private position: HarvesterPosition;
  private route: HarvesterRoute;

  constructor(protected graph: ClientGraph, data: HarversterInitialData) {
    this.type = data.type;
    this.route = {
      fromAt: data.at,
      toAt: data.at,
      vertices: [data.edge.a, data.edge.b],
    };

    this.speed = data.speed;
    this.position = { edge: data.edge, at: data.at };
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

  public getSpeed() {
    return this.score;
  }

  public getCoords() {
    const { coords } = getSegment(this.position.edge, this.position.at);
    return coords;
  }

  public getPosition() {
    return this.position;
  }

  public isFinishedRoute() {
    const isFinalRouteEdge = this.edgeIndexInRoute === this.route.vertices.length - 2;
    return isFinalRouteEdge && this.position.at === this.route.toAt;
  }

  public updateMoving(now: number) {
    const { position } = this;

    const passedDistanceInEdge = this.speed * (now - this.lastUpdateTime);

    this.lastUpdateTime = now;
    const dx = position.edge.length ? passedDistanceInEdge / position.edge.length : 1;

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
