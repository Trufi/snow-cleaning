import { Harvester } from '../games/types';

export interface InitialConnection {
  status: 'initial';
  id: string;
}

export interface PlayerConnection {
  status: 'player';
  id: string;

  /**
   * Этот id присылает нам главный сервер
   */
  userId: number;
  name: string;
}

export type Connection = InitialConnection | PlayerConnection;

export interface ConnectionsState {
  map: Map<number, Connection>;
  nextId: number;
}

export interface GamePlayer {
  /**
   * id равен connectionId
   */
  id: string;
  userId: number;
  name: string;

  score: number;

  harvester: Harvester;
}

export interface GameObserver {
  /**
   * id равен connectionId
   */
  id: number;
  userId: number;
  name: string;
}

export interface GameState {
  prevTime: number;
  time: number;
  players: Map<string, GamePlayer>;
  startTime: number;
  lastPolluteTime: number;
  lastPollutionClientUpdateTime: number;
  duration: number;
  maxPlayers: number;
  restart: {
    need: boolean;
    time: number;
    duration: number;
  };
}

export interface State {
  url: string;
  connections: ConnectionsState;
}

export interface RestartData {
  inSeconds: number;
  duration: number;
}
