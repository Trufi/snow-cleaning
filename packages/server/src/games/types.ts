export interface ClientGraphVertex {
  edges: number[]; // индексы ребер
  coords: number[];
  type: 'road' | 'house' | 'null';
  houseEdge: number; // -1 если нет
}

export interface ClientGraphEdge {
  geometry: number[][];
  a: number;
  b: number;
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
