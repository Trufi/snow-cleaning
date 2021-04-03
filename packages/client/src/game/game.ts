import { ClientGraph, ClientGraphEdge, prepareGraph } from '@game/data/clientGraph';
import { ServerMsg } from '@game/server/messages';
import { mapMap } from '@game/utils';
import { Render } from '../map/render';

const rawGraph = require('../../assets/novosibirsk.json');

export interface Harvester {
  playerId: string;
  forward: boolean;
  edge: ClientGraphEdge;
  speed: number;

  /**
   * Индекс сегмента грани, с учетом направления,
   * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
   */
  edgeSegment: number;
  passed: number;

  /**
   * Описывает местоположение на текущем сегменте грани
   * Задается от 0 до 1
   * Не зависит от направления?
   */
  positionAtSegment: number;

  edgeStartTime: number;

  coords: number[];
}

export interface GamePlayer {
  id: string;
  name: string;
  harvester: Harvester;
}

export interface GameState {
  prevTime: number;
  time: number;
  players: Map<string, GamePlayer>;
}

export class Game {
  private graph: ClientGraph;
  private state: GameState;

  constructor(private render: Render, startData: ServerMsg['startData']) {
    this.graph = prepareGraph(rawGraph);
    const time = Date.now();

    this.state = {
      prevTime: time,
      time,
      players: new Map(),
    };

    startData.players.forEach((player) => {
      const harvester: Harvester = {
        ...player.harvester,
        edge: this.graph.edges[player.harvester.edgeIndex],
      };

      const gamePlayer: GamePlayer = {
        id: player.id,
        name: player.name,
        harvester,
      };

      this.state.players.set(player.id, gamePlayer);
    });

    this.render.setPoints(
      mapMap(this.state.players, (p) => p.harvester),
      this.graph.min,
      this.graph.max,
    );

    requestAnimationFrame(this.gameLoop);
  }

  public updateFromServer(data: ServerMsg['tickData']) {
    data.harvesters.forEach((harvester) => {
      const gamePlayer = this.state.players.get(harvester.playerId);
      if (!gamePlayer) {
        return;
      }

      Object.assign(gamePlayer.harvester, harvester);
      gamePlayer.harvester.edge = this.graph.edges[harvester.edgeIndex];
    });
  }

  private gameLoop = () => {
    requestAnimationFrame(this.gameLoop);

    const time = Date.now();
    this.state.prevTime = this.state.time;
    this.state.time = time;

    this.render.render();
  };
}
