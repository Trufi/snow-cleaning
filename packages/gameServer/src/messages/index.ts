import { ObjectElement, mapMap, pick } from '@snow/utils';
import { GameState, GamePlayer } from '../types';

const serverMsgSchema = require('../../protobuf/serverMsg.proto');
const Pbf = require('pbf');

const connect = (id: number) => ({
  type: 'connect' as 'connect',
  id,
});

const gameJoinFail = () => ({
  type: 'gameJoinFail' as 'gameJoinFail',
});

const getPlayerData = (player: GamePlayer) => pick(player, ['id', 'name']);
export type PlayerData = ReturnType<typeof getPlayerData>;

const startData = (game: GameState, player: GamePlayer) => {
  const players = mapMap(game.players, getPlayerData);

  return {
    type: 'startData' as 'startData',
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

const playerLeave = (playerId: number) => ({
  type: 'playerLeave' as 'playerLeave',
  playerId,
});

const playerDeath = (playerId: number, causePlayerId: number) => ({
  type: 'playerDeath' as 'playerDeath',
  playerId,
  causePlayerId,
});

const tickData = (_game: GameState) => {
  return {
    type: 'tickData' as 'tickData',
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
  tickData: (game: GameState) => {
    const pbf = new Pbf();
    const msg = tickData(game);
    serverMsgSchema.TickData.write(msg, pbf);
    const u8 = pbf.finish() as Uint8Array;
    return u8.buffer.slice(0, u8.byteLength);
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
