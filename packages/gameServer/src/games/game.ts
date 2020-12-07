import { findMap, mapMap, mapToArray } from '@snow/utils';
import { Cmd, cmd, union } from '../commands';
import { msg, pbfMsg } from '../messages';
import { ClientMsg } from '../../client/messages';
import { config } from '../config';
import { GameState, GamePlayer, RestartData } from '../types';

export const debugInfo = (state: GameState) => {
  const { players } = state;
  return {
    ...state,
    players: mapToArray(players),
  };
};

const tickBodyRecipientIds = (gameState: GameState) => {
  return mapMap(gameState.players, (p) => p.id);
};

export const createGameState = (time: number, maxPlayers: number, duration: number): GameState => {
  return {
    prevTime: time,
    time,
    players: new Map(),
    startTime: time,
    duration,
    maxPlayers,
    restart: {
      need: false,
      time: 0,
      duration,
    },
  };
};

export const tick = (game: GameState, time: number): Cmd => {
  game.prevTime = game.time;
  game.time = time;

  const cmds: Cmd[] = [];

  cmds.push(cmd.sendPbfMsgTo(tickBodyRecipientIds(game), pbfMsg.tickData(game)));

  if (game.restart.need && game.time > game.restart.time) {
    console.log(`Restart game!`);
    cmds.push(restart(game));
  }

  return union(cmds);
};

export const canJoinPlayer = (game: GameState, userId: number) => {
  if (game.players.size >= game.maxPlayers) {
    return false;
  }
  const hasSamePlayer = findMap(game.players, (p) => p.userId === userId);
  return !hasSamePlayer;
};

export const joinPlayer = (
  game: GameState,
  id: number,
  data: {
    userId: number;
    name: string;
  },
): Cmd => {
  const { userId, name } = data;

  const gamePlayer: GamePlayer = {
    id,
    userId,
    name,
  };
  game.players.set(id, gamePlayer);

  return [cmd.sendMsg(id, msg.startData(game, gamePlayer))];
};

export const kickPlayer = (game: GameState, id: number): Cmd => {
  game.players.delete(id);

  return cmd.sendMsgTo(tickBodyRecipientIds(game), msg.playerLeave(id));
};

export const updatePlayerChanges = (game: GameState, playerId: number, clientMsg: ClientMsg['changes']): Cmd => {
  const { time } = clientMsg;

  // Если сообщение слишком старое, то не принимаем его
  if (game.time - time > config.discardMessageThreshold) {
    return;
  }

  const gamePlayer = game.players.get(playerId);
  if (!gamePlayer) {
    return;
  }

  const cmds: Cmd[] = [];

  // TODO: Какое-то обновление

  return union(cmds);
};

export const restartInSeconds = (game: GameState, data: RestartData): Cmd => {
  const { inSeconds, duration } = data;

  game.restart.need = true;
  game.restart.time = game.time + inSeconds * 1000;
  game.restart.duration = duration;

  return cmd.sendMsgTo(tickBodyRecipientIds(game), msg.restartAt(game));
};

const restart = (game: GameState): Cmd => {
  game.restart.need = false;

  const {
    restart: { duration },
  } = game;
  game.duration = duration;
  game.startTime = game.time;

  return [cmd.sendMsgTo(tickBodyRecipientIds(game), msg.restartData(game)), cmd.notifyMain()];
};
