import * as ws from 'ws';

export interface InitialConnection {
  status: 'initial';
  id: number;
  socket: ws;

  /**
   * Используется для пинга и для удаления, если не отвечает
   */
  isAlive: boolean;
}

export interface PlayerConnection {
  status: 'player';
  id: number;
  socket: ws;

  /**
   * Этот id присылает нам главный сервер
   */
  userId: number;
  name: string;

  /**
   * Используется для пинга и для удаления, если не отвечает
   */
  isAlive: boolean;
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
  id: number;
  userId: number;
  name: string;
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
  players: Map<number, GamePlayer>;
  startTime: number;
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
  game: GameState;
}

export interface RestartData {
  inSeconds: number;
  duration: number;
}
