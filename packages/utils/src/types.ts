import { ClientGraph, ClientGraphEdge } from '@trufi/roads';

export interface SnowEdgeUserData {
  pollution: number;
  enabled: boolean;
}

export type SnowClientGraphEdge = ClientGraphEdge<SnowEdgeUserData>;

export type SnowClientGraph = ClientGraph<undefined, SnowEdgeUserData>;
