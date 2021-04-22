import { ClientMsg } from '@game/client/messages';
import { addStubDataToGraph } from '@game/utils';
import { SnowClientGraph } from '@game/utils/types';
import { DataGraph, Roads } from '@trufi/roads';
import { mapMap } from '@trufi/utils';
import { Cmd, cmd, union } from '../commands';
import { config } from '../config';
import { msg } from '../messages';
import { GameState } from '../types';
import { random } from '../utils';
import { Bot } from './bot';
import { BlizzardEncounter } from './encounters/blizzardEncounter';
import { EmptyEncounter } from './encounters/emptyEncounter';
import { Player } from './player';

interface GameOptions {
  currentTime: number;
  maxPlayers: number;
}

export class Game {
  public state: GameState;
  private graph: SnowClientGraph;
  private roads: Roads;

  constructor(options: GameOptions, private executeCmd: (cmd: Cmd) => void) {
    const dataGraph: DataGraph = require('../assets/novosibirsk.json');
    addStubDataToGraph(dataGraph);

    this.roads = new Roads(dataGraph, { autoUpdate: false });
    this.graph = this.roads.graph;

    this.state = {
      startTime: options.currentTime,
      prevTime: options.currentTime,
      time: options.currentTime,
      lastPollutionClientUpdateTime: options.currentTime,
      maxPlayers: options.maxPlayers,
      players: new Map(),
      bots: new Map(),
      encounter: new BlizzardEncounter(options.currentTime, this.roads, this.onEncounterFinished),
    };

    for (let i = 0; i < 2; i++) {
      const bot = new Bot(this.roads, this.state.time);
      this.state.bots.set(bot.id, bot);
    }
  }

  public update(time: number): Cmd {
    this.state.prevTime = this.state.time;
    this.state.time = time;

    const cmds: Cmd[] = [];

    this.state.encounter.update(time);

    this.state.players.forEach((player) => {
      player.update(time);
    });

    this.state.bots.forEach((bot) => {
      bot.update(this.state.time);
      if (bot.timeIsPassed(this.state.time)) {
        this.state.bots.delete(bot.id);
        cmds.push(cmd.sendMsgToAllInGame(msg.playerLeave(bot.id)));

        setTimeout(() => {
          const bot = new Bot(this.roads, this.state.time);
          this.state.bots.set(bot.id, bot);
          this.executeCmd(cmd.sendMsgToAllInGame(msg.playerEnter(bot)));
        }, 20000 * random());
      }
    });

    // cmds.push(cmd.sendPbfMsgTo(getTickBodyRecipientIds(this.state), pbfMsg.tickData(this.state)));
    cmds.push(cmd.sendMsgTo(getTickBodyRecipientIds(this.state), msg.tickData(this.state)));

    if (time - this.state.lastPollutionClientUpdateTime > config.clientPollutionUpdateInterval) {
      this.state.lastPollutionClientUpdateTime = time;
      cmds.push(
        cmd.sendMsgTo(getTickBodyRecipientIds(this.state), msg.pollutionData(this.graph, this.state.encounter)),
      );
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

  public getDebugInfo() {
    const { players, bots } = this.state;
    return {
      ...this.state,
      players: mapMap(players, (player) => player.getDebugInfo()),
      bots: mapMap(bots, (bot) => bot.getDebugInfo()),
      edges: this.graph.edges.map(({ index, userData: { pollution } }) => ({ index, pollution })),
    };
  }

  private onEncounterFinished = () => {
    const cmds: Cmd[] = [];

    cmds.push(cmd.sendMsgToAllInGame(msg.encounterFinished()));

    if (this.state.encounter.type === 'blizzard') {
      this.state.encounter = new EmptyEncounter(this.state.time, this.roads, this.onEncounterFinished);
    } else {
      this.state.encounter = new BlizzardEncounter(this.state.time, this.roads, this.onEncounterFinished);
    }

    cmds.push(cmd.sendMsgToAllInGame(msg.encounterStarted(this.graph, this.state.encounter)));

    this.executeCmd(union(cmds));

    this.state.bots.forEach((bot) => bot.onEncounterStarted(this.state.encounter));
  };
}

const getTickBodyRecipientIds = (gameState: GameState) => {
  return mapMap(gameState.players, (p) => p.id);
};
