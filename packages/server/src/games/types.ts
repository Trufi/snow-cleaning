import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';

export interface Position {
  edge: ClientGraphEdge;
  at: number;
}

export interface HarvesterFutureRoute {
  time: number;
  fromAt: number;
  vertices: ClientGraphVertex[];
  toAt: number;
}

export interface Harvester {
  playerId: string;
  speed: number;
  score: number;

  futureRoutes: HarvesterFutureRoute[];

  route: HarvesterFutureRoute;
  forward: boolean;
  edgeIndexInRoute: number;
  position: Position;
  lastUpdateTime: number;
}
