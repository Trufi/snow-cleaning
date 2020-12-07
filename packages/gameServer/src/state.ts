import { State } from './types';
import * as game from './games/game';

export const createState = (
  settings: {
    url: string;
    maxPlayers: number;
    duration: number;
  },
  time: number,
): State => {
  const { url, maxPlayers, duration } = settings;
  return {
    url,
    connections: {
      map: new Map(),
      nextId: 1,
    },
    game: game.createGameState(time, maxPlayers, duration),
  };
};
