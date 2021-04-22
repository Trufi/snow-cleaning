import { Bot } from '../games/bot';
import { BlizzardEncounter } from '../games/encounters/blizzardEncounter';
import { EmptyEncounter } from '../games/encounters/emptyEncounter';
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

export type Encounter = EmptyEncounter | BlizzardEncounter;

export interface GameState {
  prevTime: number;
  time: number;
  players: Map<string, Player>;
  bots: Map<string, Bot>;
  startTime: number;
  lastPollutionClientUpdateTime: number;
  maxPlayers: number;
  encounter: Encounter;
}

export interface State {
  url: string;
  connections: ConnectionsState;
}
