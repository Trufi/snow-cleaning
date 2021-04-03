import { ObjectElement, mapMap, pick } from '@game/utils';
import { Harvester } from '../games/types';
import { GameState, GamePlayer } from '../types';

const connect = (id: string) => ({
  type: 'connect' as 'connect',
  id,
});

const gameJoinFail = () => ({
  type: 'gameJoinFail' as 'gameJoinFail',
});

const getHarvesterData = (harvester: Harvester) => ({
  ...pick(harvester, ['playerId', 'edgeSegment', 'edgeStartTime', 'forward', 'passed', 'positionAtSegment', 'speed']),
  edgeIndex: harvester.edge.index,
});

const getPlayerData = (player: GamePlayer) => ({
  ...pick(player, ['id', 'name']),
  harvester: getHarvesterData(player.harvester),
});
export type PlayerData = ReturnType<typeof getPlayerData>;

const startData = (game: GameState, player: GamePlayer) => {
  const players = mapMap(game.players, getPlayerData);

  return {
    type: 'startData' as const,
    playerId: player.id,
    endTime: game.startTime + game.duration,
    players,
  };
};

const restartData = (game: GameState) => {
  const players = mapMap(game.players, getPlayerData);

  return {
    type: 'restartData' as 'restartData',
    endTime: game.startTime + game.duration,
    players,
  };
};

const playerEnter = (player: GamePlayer) => ({
  type: 'playerEnter' as 'playerEnter',
  player: getPlayerData(player),
});

const playerNewBody = (player: GamePlayer) => ({
  type: 'playerNewBody' as 'playerNewBody',
  playerId: player.id,
});

const playerLeave = (playerId: string) => ({
  type: 'playerLeave' as 'playerLeave',
  playerId,
});

const playerDeath = (playerId: number, causePlayerId: number) => ({
  type: 'playerDeath' as 'playerDeath',
  playerId,
  causePlayerId,
});

const tickData = (game: GameState) => {
  return {
    type: 'tickData' as const,
    harvesters: mapMap(game.players, (player) => getHarvesterData(player.harvester)),
  };
};

const pong = (serverTime: number, clientTime: number) => ({
  type: 'pong' as 'pong',
  serverTime,
  clientTime,
});

const restartAt = (game: GameState) => ({
  type: 'restartAt' as 'restartAt',
  time: game.restart.time,
});

export const msg = {
  connect,
  gameJoinFail,
  startData,
  playerEnter,
  playerNewBody,
  playerLeave,
  playerDeath,
  tickData,
  pong,
  restartAt,
  restartData,
};

export const pbfMsg = {
  tickData: (_game: GameState) => {
    return new Uint8Array(0);
  },
};

/**
 * Union тип всех сообщений сервера
 */
export type AnyServerMsg = ReturnType<ObjectElement<typeof msg>>;

type MsgMap = typeof msg;
/**
 * Мапа всех сообщений сервера, с помощью которой можно получить конкретное:
 * type TickDataMsg = ServerMsg['tickData'];
 */
export type ServerMsg = { [K in keyof MsgMap]: ReturnType<MsgMap[K]> };
