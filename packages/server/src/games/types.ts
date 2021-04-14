import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';

export interface Position {
  edge: ClientGraphEdge;
  at: number;
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
  edgeStartTime: number;
}
