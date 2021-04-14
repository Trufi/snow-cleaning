import { ClientGraph, prepareGraph } from '@game/data/clientGraph';
import { clamp, findMap, mapMap, mapToArray } from '@game/utils';
import { ClientMsg } from '@game/client/messages';
import { Cmd, cmd, union } from '../commands';
import { msg } from '../messages';
import { config } from '../config';
import { GameState, GamePlayer, RestartData } from '../types';
import { createHarvester, setHarvesterRoute, updateHarvester } from './harvester';

interface GameOptions {
  currentTime: number;
  maxPlayers: number;
  duration: number;
}

export class Game {
  public state: GameState;
  private graph: ClientGraph;

  constructor(options: GameOptions) {
    this.state = {
      startTime: options.currentTime,
      prevTime: options.currentTime,
      time: options.currentTime,
      lastPolluteTime: options.currentTime,
      lastPollutionClientUpdateTime: options.currentTime,
      duration: options.duration,
      maxPlayers: options.duration,
      players: new Map(),
      restart: {
        need: false,
        time: 0,
        duration: 0,
      },
    };

    this.graph = prepareGraph(require('../../../newdata/assets/novosibirsk.json'));
  }

  public update(time: number): Cmd {
    this.state.prevTime = this.state.time;
    this.state.time = time;

    const cmds: Cmd[] = [];

    updateHarvesters(this.graph, this.state);
    polluteRoads(this.graph, this.state);

    // cmds.push(cmd.sendPbfMsgTo(getTickBodyRecipientIds(this.state), pbfMsg.tickData(this.state)));
    cmds.push(cmd.sendMsgTo(getTickBodyRecipientIds(this.state), msg.tickData(this.state)));

    if (time - this.state.lastPollutionClientUpdateTime > config.clientPollutionUpdateInterval) {
      this.state.lastPollutionClientUpdateTime = time;
      cmds.push(cmd.sendMsgTo(getTickBodyRecipientIds(this.state), msg.pollutionData(this.graph)));
    }

    if (needToRestart(this.state)) {
      console.log(`Restart game!`);
      cmds.push(restart(this.state));
    }

    return union(cmds);
  }

  public canPlayerBeAdded(userId: number) {
    if (this.state.players.size >= this.state.maxPlayers) {
      return false;
    }
    const hasSamePlayer = findMap(this.state.players, (p) => p.userId === userId);
    return !hasSamePlayer;
  }

  public addPlayer(
    id: string,
    data: {
      userId: number;
      name: string;
    },
  ): Cmd {
    const { userId, name } = data;

    const harvester = createHarvester(id, this.graph);

    const gamePlayer: GamePlayer = {
      id,
      userId,
      name,
      score: 0,
      harvester,
    };
    this.state.players.set(id, gamePlayer);

    return [
      cmd.sendMsg(id, msg.startData(this.state, gamePlayer)),
      cmd.sendMsgToAllInGame(msg.playerEnter(gamePlayer)),
    ];
  }

  public removePlayer(id: string): Cmd {
    this.state.players.delete(id);

    return cmd.sendMsgToAllInGame(msg.playerLeave(id));
  }

  public setPlayerRoute(playerId: string, data: ClientMsg['newRoute']): Cmd {
    const player = this.state.players.get(playerId);
    if (!player) {
      // TODO: добавить логирование этого безобразия
      return;
    }

    // TODO: проверка, что путь валидный, а также что такие индексы вообще есть

    const route = data.vertexIndices.map((index) => this.graph.vertices[index]);

    setHarvesterRoute(player.harvester, this.state.time, data.fromAt, route, data.toAt);
  }

  public updatePlayerChanges(playerId: string, clientMsg: any): Cmd {
    const { time } = clientMsg;

    // Если сообщение слишком старое, то не принимаем его
    if (this.state.time - time > config.discardMessageThreshold) {
      return;
    }

    const gamePlayer = this.state.players.get(playerId);
    if (!gamePlayer) {
      return;
    }

    const cmds: Cmd[] = [];

    // TODO: Какое-то обновление

    return union(cmds);
  }

  public restartInSeconds(data: RestartData): Cmd {
    const { inSeconds, duration } = data;

    this.state.restart.need = true;
    this.state.restart.time = this.state.time + inSeconds * 1000;
    this.state.restart.duration = duration;

    return cmd.sendMsgTo(getTickBodyRecipientIds(this.state), msg.restartAt(this.state));
  }

  public getDebugInfo() {
    const { players } = this.state;
    return {
      ...this.state,
      players: mapToArray(players),
    };
  }
}

function needToRestart(state: GameState) {
  return state.restart.need && state.time > state.restart.time;
}

function updateHarvesters(graph: ClientGraph, state: GameState) {
  state.players.forEach((player) => {
    updateHarvester(graph, player, state.time);
  });
}

function polluteRoads(graph: ClientGraph, state: GameState) {
  const dt = state.time - state.lastPolluteTime;

  if (dt < config.polluteInterval) {
    return;
  }

  state.lastPolluteTime = state.time;

  const pollutionFactor = 0.005;
  graph.edges.forEach((edge) => {
    edge.pollution = clamp(edge.pollution + (dt * pollutionFactor) / 1000, 0, 1);
  });
}

const getTickBodyRecipientIds = (gameState: GameState) => {
  return mapMap(gameState.players, (p) => p.id);
};

const restart = (state: GameState): Cmd => {
  state.restart.need = false;

  const {
    restart: { duration },
  } = state;
  state.duration = duration;
  state.startTime = state.time;

  return [cmd.sendMsgTo(getTickBodyRecipientIds(state), msg.restartData(state)), cmd.notifyMain()];
};
