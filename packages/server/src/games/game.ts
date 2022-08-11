import { ClientMsg } from '@game/client/messages';
import { addStubDataToGraph } from '@game/utils';
import { SnowClientGraph } from '@game/utils/types';
import { DataGraph, Roads } from '@trufi/roads';
import { clamp, mapMap, mapPointFromLngLat, vec2dist } from '@trufi/utils';
import { Cmd, cmd, union } from '../commands';
import { config } from '../config';
import { msg } from '../messages';
import { GameState, RestartData } from '../types';
import { random } from '../utils';
import { Bot } from './bot';
import { Player } from './player';

interface GameOptions {
  currentTime: number;
  maxPlayers: number;
  duration: number;
}

export class Game {
  public state: GameState;
  private graph: SnowClientGraph;
  private roads: Roads;

  constructor(options: GameOptions, private executeCmd: (cmd: Cmd) => void) {
    this.state = {
      startTime: options.currentTime,
      prevTime: options.currentTime,
      time: options.currentTime,
      lastPolluteTime: options.currentTime,
      lastPollutionClientUpdateTime: options.currentTime,
      duration: options.duration,
      maxPlayers: options.maxPlayers,
      players: new Map(),
      bots: new Map(),
      restart: {
        need: false,
        time: 0,
        duration: 0,
      },
    };

    const dataGraph: DataGraph = require('../assets/novosibirsk.json');
    addStubDataToGraph(dataGraph);

    this.roads = new Roads(dataGraph, { autoUpdate: false });
    this.graph = this.roads.graph;

    enableEdgesInRadius(this.graph, mapPointFromLngLat([82.92170167330326, 55.028492869990366]), 2 * 1000 * 100);

    for (let i = 0; i < 2; i++) {
      const bot = new Bot(this.graph, this.state.time);
      this.state.bots.set(bot.id, bot);
    }
  }

  public update(time: number): Cmd {
    this.state.prevTime = this.state.time;
    this.state.time = time;

    const cmds: Cmd[] = [];

    this.state.players.forEach((player) => {
      player.update(time);
    });

    this.state.bots.forEach((bot) => {
      bot.update(this.state.time);
      if (bot.timeIsPassed(this.state.time)) {
        this.state.bots.delete(bot.id);
        cmds.push(cmd.sendMsgToAllInGame(msg.playerLeave(bot.id)));

        setTimeout(() => {
          const bot = new Bot(this.graph, this.state.time);
          this.state.bots.set(bot.id, bot);
          this.executeCmd(cmd.sendMsgToAllInGame(msg.playerEnter(bot)));
        }, 20000 * random());
      }
    });

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

  public canPlayerBeAdded() {
    return this.state.players.size < this.state.maxPlayers;
  }

  public addPlayer(id: string, name: string): Cmd {
    const player = new Player(id, name, this.graph);
    this.state.players.set(player.id, player);

    return [
      cmd.sendMsg(id, msg.startData(this.state, player, this.graph)),
      cmd.sendMsgToAllInGame(msg.playerEnter(player)),
    ];
  }

  public removePlayer(id: string): Cmd {
    this.state.players.delete(id);

    return cmd.sendMsgToAllInGame(msg.playerLeave(id));
  }

  public setPlayerRoute(playerId: string, data: ClientMsg['newRoute']): Cmd {
    const player = this.state.players.get(playerId);
    if (player) {
      player.addRouteFromClient(data);
    }
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
    const { players, bots } = this.state;
    return {
      ...this.state,
      players: mapMap(players, (player) => player.getDebugInfo()),
      bots: mapMap(bots, (bot) => bot.getDebugInfo()),
      edges: this.graph.edges.map(({ index, userData: { pollution } }) => ({ index, pollution })),
    };
  }
}

function needToRestart(state: GameState) {
  return state.restart.need && state.time > state.restart.time;
}

function polluteRoads(graph: SnowClientGraph, state: GameState) {
  const dt = state.time - state.lastPolluteTime;

  if (dt < config.polluteInterval) {
    return;
  }

  state.lastPolluteTime = state.time;

  const pollutionFactor = 0.005;
  graph.edges.forEach((edge) => {
    edge.userData.pollution = clamp(edge.userData.pollution + (dt * pollutionFactor) / 1000, 0, 1);
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

function enableEdgesInRadius(graph: SnowClientGraph, center: number[], radius: number) {
  for (const edge of graph.edges) {
    if (vec2dist(edge.a.coords, center) < radius || vec2dist(edge.b.coords, center) < radius) {
      edge.userData.enabled = true;
    }
  }
}
