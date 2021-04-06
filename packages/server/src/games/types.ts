import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';

export interface Harvester {
  playerId: string;
  forward: boolean;

  route: ClientGraphVertex[];
  edgeIndexInRoute: number;
  edge: ClientGraphEdge | undefined;

  speed: number;

  /**
   * Индекс сегмента грани, с учетом направления,
   * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
   */
  edgeSegment: number;
  passed: number;

  /**
   * Описывает местоположение на текущем сегменте грани
   * Задается от 0 до 1
   * Не зависит от направления?
   */
  positionAtSegment: number;

  edgeStartTime: number;

  coords: number[];
}
