import { Point, PointMoveEvent, Route } from '@trufi/roads';
import { clamp } from '@trufi/utils';
import { SnowClientGraphEdge, SnowEdgeUserData } from './types';

export interface HarvesterInitialData {
  edge: SnowClientGraphEdge;
  at: number;
  speed: number;
  color: number;
  score: number;
}

export class Harvester {
  public readonly color: number;
  public point: Point;
  private score: number;
  private speed: number;

  private lastUpdateTime = 0;

  constructor(data: HarvesterInitialData) {
    this.point = new Point({
      position: {
        edge: data.edge,
        at: data.at,
      },
      speed: data.speed,
    });
    this.point.on('move', this.onMove);

    this.speed = data.speed;
    this.color = data.color;
    this.score = data.score;
  }

  public setRoute(time: number, route: Route) {
    this.point.setRoute(route);
    this.lastUpdateTime = time;
  }

  public getRoute() {
    return this.point.getRoute();
  }

  public getScore() {
    return this.score;
  }

  public getSpeed() {
    return this.speed;
  }

  public getCoords() {
    return this.point.getCoords();
  }

  public getPosition() {
    return this.point.getPosition();
  }

  public isFinishedRoute() {
    return this.point.isFinishedRoute();
  }

  public updateMoving(time: number) {
    const dt = time - this.lastUpdateTime;
    this.point.updateMoving(dt);
    this.lastUpdateTime = time;
  }

  public getDebugInfo() {
    const position = this.point.getPosition();
    return {
      score: this.score,
      speed: this.speed,
      at: position.at,
      edge: position.edge.index,
    };
  }

  private onMove = ({ edge, passedDistance }: PointMoveEvent<SnowEdgeUserData>) => {
    const edgeData = edge.userData;

    if (edgeData.enabled) {
      const dx = edge.length ? passedDistance / edge.length : 1;

      // Обновляем загрязнение дороги и начисляем очки
      const nextPollution = clamp(edgeData.pollution - edgeData.pollution * dx, 0, 1);
      this.score += ((edgeData.pollution - nextPollution) * edge.length) / 1000;
      edgeData.pollution = nextPollution;
    }
  };
}
