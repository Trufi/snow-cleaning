import { ClientGraph, ClientGraphEdge, ClientGraphVertex, prepareGraph } from '@game/data/clientGraph';
import { ServerMsg } from '@game/server/messages';
import { mapMap } from '@game/utils';
import { vec2dist } from '@game/utils/vec2';
import { cmd, Cmd } from '../commands';
import { drawRoute } from '../map/drawRoute';
import { Render } from '../map/render';
import { msg } from '../messages';
import { renderUI } from '../renderUI';
import { projectMapToGeo } from '../utils';
import { pathFind } from './pathfind';

const rawGraph = require('../../assets/novosibirsk.json');

export interface Harvester {
  playerId: string;
  forward: boolean;
  edge: ClientGraphEdge | undefined;
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
  score: number;
  harvester: Harvester;
}

export interface GameState {
  prevTime: number;
  time: number;
  players: Map<string, GamePlayer>;
  currentPlayer: GamePlayer;
}

export class Game {
  private graph: ClientGraph;
  private state: GameState;

  constructor(private render: Render, startData: ServerMsg['startData']) {
    this.graph = prepareGraph(rawGraph);
    const time = Date.now();

    const players: GameState['players'] = new Map();
    startData.players.forEach((player) => {
      const harvester: Harvester = {
        ...player.harvester,
        edge: this.graph.edges[player.harvester.edgeIndex],
      };

      const gamePlayer: GamePlayer = {
        id: player.id,
        name: player.name,
        score: player.score,
        harvester,
      };

      players.set(player.id, gamePlayer);
    });

    this.state = {
      prevTime: time,
      time,
      players,
      currentPlayer: players.get(startData.playerId) as GamePlayer, // TODO: обработать бы
    };

    this.updatePointsSize();

    this.render.setLines(this.graph.edges, this.graph.min, this.graph.max);

    requestAnimationFrame(this.gameLoop);
  }

  public addPlayer(data: ServerMsg['playerEnter']) {
    const { player } = data;
    if (this.state.currentPlayer.id === player.id) {
      return;
    }

    if (this.state.players.has(player.id)) {
      console.error('Такой игрок уже есть!');
      return;
    }

    const harvester: Harvester = {
      ...player.harvester,
      edge: this.graph.edges[player.harvester.edgeIndex],
    };

    const gamePlayer: GamePlayer = {
      id: player.id,
      name: player.name,
      score: player.score,
      harvester,
    };

    this.state.players.set(player.id, gamePlayer);

    this.updatePointsSize();
  }

  public removePlayer(data: ServerMsg['playerLeave']) {
    const player = this.state.players.get(data.playerId);
    if (!player) {
      return;
    }
    this.state.players.delete(player.id);
    this.updatePointsSize();
  }

  public updateFromServer(data: ServerMsg['tickData']) {
    data.players.forEach((player) => {
      const gamePlayer = this.state.players.get(player.id);
      if (!gamePlayer) {
        return;
      }

      Object.assign(gamePlayer.harvester, player.harvester);
      gamePlayer.harvester.edge =
        player.harvester.edgeIndex !== -1 ? this.graph.edges[player.harvester.edgeIndex] : undefined;

      gamePlayer.score = player.score;
    });

    this.render.map.setCenter(projectMapToGeo(this.state.currentPlayer.harvester.coords));
    renderUI(this.state);
  }

  public updatePollutionFromServer(data: ServerMsg['pollutionData']) {
    for (const key in data.changedEdges) {
      const index = Number(key);
      this.graph.edges[index].pollution = data.changedEdges[key];
    }

    this.render.updateLines(this.graph.edges);
  }

  public goToPoint(mapPoint: number[]): Cmd {
    const toVertex = findNearestGraphVertex(this.graph, mapPoint);

    // TODO: мы и так знаем, где находится игрок сейчас, надо выбрать вершину из двух
    const fromVertex = findNearestGraphVertex(this.graph, this.state.currentPlayer.harvester.coords);

    const path = pathFind(fromVertex, toVertex);
    if (!path) {
      return;
    }

    drawRoute(this.render.map, path);

    return cmd.sendMsg(msg.newRoute(path));
  }

  private gameLoop = () => {
    requestAnimationFrame(this.gameLoop);

    const time = Date.now();
    this.state.prevTime = this.state.time;
    this.state.time = time;

    this.render.render();
  };

  private updatePointsSize() {
    this.render.setPoints(
      mapMap(this.state.players, (p) => p.harvester),
      this.graph.min,
      this.graph.max,
    );
  }
}

function findNearestGraphVertex(graph: ClientGraph, point: number[]) {
  let minDistance = Infinity;
  let nearestVertex: ClientGraphVertex = graph.vertices[0];

  for (const vertex of graph.vertices) {
    const dist = vec2dist(point, vertex.coords);
    if (minDistance > dist) {
      minDistance = dist;
      nearestVertex = vertex;
    }
  }

  return nearestVertex;
}
