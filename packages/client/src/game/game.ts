import RBush from 'rbush';
import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { ServerMsg } from '@game/server/messages';
import { mapMap, getClosestPointOnLineSegment } from '@game/utils';
import { vec2dist } from '@game/utils/vec2';
import { cmd, Cmd } from '../commands';
import { drawMarker, drawRoute } from '../map/drawRoute';
import { Render } from '../map/render';
import { msg } from '../messages';
import { renderUI } from '../renderUI';
// import { projectMapToGeo } from '../utils';
import { pathFindFromMidway } from './pathfind';
import { Position } from '../types';

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
  private state: GameState;
  private graphVerticesTree: RBush<{ vertex: ClientGraphVertex }>;

  constructor(private graph: ClientGraph, private render: Render, startData: ServerMsg['startData']) {
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

    this.graphVerticesTree = new RBush();
    this.graphVerticesTree.load(this.graph.vertices.map((vertex) => createPoint(vertex.coords, vertex)));

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

      if (player.harvester.edgeIndex !== -1) {
        gamePlayer.harvester.edge = this.graph.edges[player.harvester.edgeIndex];
      }

      gamePlayer.score = player.score;
    });

    // this.render.map.setCenter(projectMapToGeo(this.state.currentPlayer.harvester.coords));
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
    const toPosition = findNearestGraphVertex(this.graph, this.graphVerticesTree, mapPoint);
    if (!toPosition) {
      return;
    }

    drawMarker(this.render.map, toPosition.coords);

    const harvester = this.state.currentPlayer.harvester;
    const fromPosition: Position = {
      edge: harvester.edge,
      segmentIndex: harvester.edgeSegment,
      t: harvester.positionAtSegment,
      coords: harvester.coords,
    };
    const path = pathFindFromMidway(fromPosition, toPosition);
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

function findNearestGraphVertex(
  graph: ClientGraph,
  graphVerticesTree: RBush<{ vertex: ClientGraphVertex }>,
  point: number[],
) {
  const offset = 131072; // половина размера тайла 14-го зума

  const vertices = graphVerticesTree.search(createPointBBox(point, offset)).map((res) => res.vertex);
  const edgeIndices = new Set<number>();
  for (const vertex of vertices) {
    for (const edge of vertex.edges) {
      edgeIndices.add(edge.index);
    }
  }

  let minDistance = offset;
  let nearest: Position | undefined;

  edgeIndices.forEach((index) => {
    const edge = graph.edges[index];

    for (let i = 0; i < edge.geometry.length - 1; i++) {
      const closestPoint = getClosestPointOnLineSegment(point, edge.geometry[i], edge.geometry[i + 1]);
      const distance = vec2dist(point, closestPoint.point);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          edge,
          segmentIndex: i,
          t: closestPoint.t,
          coords: closestPoint.point,
        };
      }
    }
  });

  return nearest;
}

function createPoint(point: number[], vertex: ClientGraphVertex) {
  return {
    minX: point[0],
    minY: point[1],
    maxX: point[0],
    maxY: point[1],
    vertex,
  };
}

function createPointBBox(point: number[], offset: number) {
  return {
    minX: point[0] - offset,
    minY: point[1] - offset,
    maxX: point[0] + offset,
    maxY: point[1] + offset,
  };
}
