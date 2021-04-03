export interface ClientGraphVertex {
  index: number;
  edges: ClientGraphEdge[];
  coords: number[];
  type: 'road' | 'house' | 'null';
  // houseEdge: ClientGraphEdge | undefined; // undefined если нет
}

export interface ClientGraphEdge {
  index: number;
  geometry: number[][];
  a: ClientGraphVertex;
  b: ClientGraphVertex;
  type: 'road' | 'house' | 'null';
  pollution: number;
}

export interface ClientGraph {
  vertices: ClientGraphVertex[];
  edges: ClientGraphEdge[];
  center: number[];
  min: number[];
  max: number[];
}

export interface Harvester {
  playerId: string;
  forward: boolean;
  edge: ClientGraphEdge;
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
}
