import { Bot } from '../games/bot';
import { Player } from '../games/player';

export interface InitialConnection {
  status: 'initial';
  id: string;
}

export interface PlayerConnection {
  status: 'player';
  id: string;
  name: string;
}

export type Connection = InitialConnection | PlayerConnection;

export interface ConnectionsState {
  map: Map<number, Connection>;
  nextId: number;
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
  players: Map<string, Player>;
  bots: Map<string, Bot>;
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
