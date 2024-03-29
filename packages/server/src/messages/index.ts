import { ObjectElement } from '@game/utils';
import { SnowClientGraph } from '@game/utils/types';
import { mapMap, round } from '@trufi/utils';
import { Bot } from '../games/bot';
import { Player } from '../games/player';
import { GameState } from '../types';

const connect = (id: string) => ({
  type: 'connect' as const,
  id,
});

const gameJoinFail = () => ({
  type: 'gameJoinFail' as const,
});

const getPlayerData = (player: Bot | Player) => ({
  id: player.id,
  name: player.name,
  score: player.harvester.getScore(),
  harvester: {
    color: player.harvester.color,
    speed: player.harvester.getSpeed(),
    edgeIndex: player.harvester.getPosition().edge.index,
    at: player.harvester.getPosition().at,
  },
});
export type PlayerData = ReturnType<typeof getPlayerData>;

const startData = (game: GameState, player: Player, graph: SnowClientGraph) => {
  const playerData = mapMap(game.players, getPlayerData);
  const botData = mapMap(game.bots, getPlayerData);

  return {
    type: 'startData' as const,
    playerId: player.id,
    endTime: game.startTime + game.duration,
    players: playerData.concat(botData),
    enabledEdges: graph.edges.filter((edge) => edge.userData.enabled).map((edge) => edge.index),
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

const playerEnter = (player: Player | Bot) => ({
  type: 'playerEnter' as const,
  player: getPlayerData(player),
});

const playerLeave = (playerId: string) => ({
  type: 'playerLeave' as const,
  playerId,
});

const getPlayerTickData = (player: Player | Bot) => ({
  id: player.id,
  score: player.harvester.getScore(),
  harvester: {
    speed: player.harvester.getSpeed(),
    edgeIndex: player.harvester.getPosition().edge.index,
    at: player.harvester.getPosition().at,
  },
});

const tickData = (game: GameState) => {
  const playerData = mapMap(game.players, getPlayerTickData);
  const botData = mapMap(game.bots, getPlayerTickData);

  return {
    type: 'tickData' as const,
    time: game.time,
    players: playerData.concat(botData),
  };
};

const pollutionData = (graph: SnowClientGraph) => {
  const changedEdges: { [index: string]: number } = {};
  graph.edges.forEach((edge, index) => {
    const pollution = round(edge.userData.pollution, 1);
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
