import { ObjectElement } from '@game/utils';
import { SnowClientGraph, SnowClientGraphEdge } from '@game/utils/types';
import { mapMap, round } from '@trufi/utils';
import { Bot } from '../games/bot';
import { Player } from '../games/player';
import { Encounter, GameState } from '../types';

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
    players: playerData.concat(botData),
    edges: graph.edges
      .filter(({ userData: {pollution} }) => round(pollution, 1) > 0)
      .map(({ index, userData: {pollution, enabled} }) => ({
        index,
        pollution: round(pollution, 1),
        enabled,
      })),
    encounter: {
      type: game.encounter.type,
      startTime: game.encounter.startTime,
      duration: game.encounter.duration,
    },
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

const previoslySentEdges = new WeakMap<SnowClientGraphEdge, number>();
const pollutionData = (graph: SnowClientGraph, encounter: Encounter) => {
  const changedEdges: { [index: string]: number } = {};
  graph.edges.forEach((edge, index) => {
    const pollution = round(edge.userData.pollution, 1);
    const prevPollution = previoslySentEdges.get(edge);
    if (pollution !== prevPollution) {
      changedEdges[index] = pollution;
      previoslySentEdges.set(edge, pollution);
    }
  });

  return {
    type: 'pollution' as const,
    changedEdges,
    encounterReadyPercent: encounter.getReadyPercent(),
  };
};

const pong = (serverTime: number, clientTime: number) => ({
  type: 'pong' as const,
  serverTime,
  clientTime,
});

const encounterStarted = (graph: SnowClientGraph, encounter: Encounter) => ({
  type: 'encounterStarted' as const,
  enabledEdges: graph.edges.filter((edge) => edge.userData.enabled).map((edge) => edge.index),
  encounter: {
    type: encounter.type,
    startTime: encounter.startTime,
    duration: encounter.duration,
  },
});

const encounterFinished = () => ({
  type: 'encounterFinished' as const,
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
  encounterStarted,
  encounterFinished,
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
