import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';

export interface Position {
  edge: ClientGraphEdge;

  // /**
  //  * Индекс сегмента грани, с учетом направления,
  //  * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
  //  */
  // segmentIndex: number;

  // /**
  //  * Описывает местоположение на текущем сегменте грани
  //  * Задается от 0 до 1
  //  */
  // positionAtSegment: number;

  at: number;

  // coords: number[];
}

export interface HarvesterRoute {
  fromAt: number;
  vertices: ClientGraphVertex[];
  toAt: number;
}

export interface Harvester {
  playerId: string;
  speed: number;

  route: HarvesterRoute;
  forward: boolean;
  edgeIndexInRoute: number;
  position: Position;
  passed: number;
  edgeStartTime: number;
}
