import { ClientGraph } from '@game/data/clientGraph';
import { ObjectElement, mapMap, pick, round } from '@game/utils';
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
  ...pick(harvester, ['playerId', 'edgeStartTime', 'forward', 'passed', 'speed']),
  position: {
    ...pick(harvester.position, ['at']),
    edgeIndex: harvester.position.edge.index,
  },
});

const getPlayerData = (player: GamePlayer) => ({
  ...pick(player, ['id', 'name', 'score']),
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
  type: 'playerEnter' as const,
  player: getPlayerData(player),
});

const playerLeave = (playerId: string) => ({
  type: 'playerLeave' as const,
  playerId,
});

const tickData = (game: GameState) => {
  return {
    type: 'tickData' as const,
    players: mapMap(game.players, (player) => ({
      ...pick(player, ['id', 'score']),
      harvester: getHarvesterData(player.harvester),
    })),
  };
};

const pollutionData = (graph: ClientGraph) => {
  const changedEdges: { [index: string]: number } = {};
  graph.edges.forEach((edge, index) => {
    const pollution = round(edge.pollution, 1);
    if (pollution !== 1) {
      changedEdges[index] = pollution;
    }
  });

  return {
    type: 'pollution' as const,
    changedEdges,
  };
};

const pong = (serverTime: number, clientTime: number) => ({
  type: 'pong' as const,
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
  playerLeave,
  tickData,
  pollutionData,
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
