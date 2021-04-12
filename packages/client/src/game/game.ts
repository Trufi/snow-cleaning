import RBush from 'rbush';
import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { PlayerData, ServerMsg } from '@game/server/messages';
import { mapMap, getClosestPointOnLineSegment } from '@game/utils';
import { projectGeoToMap, projectMapToGeo } from '@game/utils/geo';
import { vec2dist } from '@game/utils/vec2';
import { cmd, Cmd } from '../commands';
import { drawMarker, drawRoute } from '../map/drawRoute';
import { Render } from '../map/render';
import { msg } from '../messages';
import { renderUI } from '../renderUI';
import { pathFindFromMidway } from './pathfind';
import { Position } from '../types';
import { getAtFromSegment, getSegment } from '../utils';
import { MouseZoom } from '../map/handlers/mouseZoom';
import { MousePitchRotate } from '../map/handlers/mousePitchRotate';
import { TouchZoomRotate } from '../map/handlers/touchZoomRotate';

export interface Harvester {
  playerId: string;
  forward: boolean;
  speed: number;

  position: Position;
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

function createHarvester(graph: ClientGraph, serverHarvester: PlayerData['harvester']) {
  const edge = graph.edges[serverHarvester.position.edgeIndex];
  const { segmentIndex, coords, positionAtSegment } = getSegment(edge, serverHarvester.position.at);
  const harvester: Harvester = {
    ...serverHarvester,
    position: {
      ...serverHarvester.position,
      edge,
      segmentIndex,
      positionAtSegment,
      coords,
    },
  };
  return harvester;
}

export class Game {
  private state: GameState;
  private graphVerticesTree: RBush<{ vertex: ClientGraphVertex }>;
  private mouseZoom: MouseZoom;
  private mousePitchRotate: MousePitchRotate;
  private touchZoomRotate: TouchZoomRotate;

  constructor(private graph: ClientGraph, private render: Render, startData: ServerMsg['startData']) {
    const time = Date.now();

    const players: GameState['players'] = new Map();
    startData.players.forEach((player) => {
      const harvester = createHarvester(this.graph, player.harvester);
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

    document.getElementById('map')?.addEventListener('mousemove', (ev) => {
      const lngLat = this.render.map.unproject([ev.clientX, ev.clientY]);
      const point = projectGeoToMap(lngLat);
      const toPosition = findNearestGraphVertex(this.graph, this.graphVerticesTree, point);
      if (!toPosition) {
        return;
      }
      drawMarker(this.render.map, toPosition.coords);
      // highlightEdge(this.render.map, toPosition.edge);
    });

    const handlerContainer = document.getElementById('bbb') as HTMLElement;
    this.mouseZoom = new MouseZoom(this.render.map, handlerContainer);
    this.mousePitchRotate = new MousePitchRotate(this.render.map, handlerContainer);
    this.touchZoomRotate = new TouchZoomRotate(this.render.map, handlerContainer);

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

    const harvester = createHarvester(this.graph, player.harvester);
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
    data.players.forEach((serverPlayer) => {
      const gamePlayer = this.state.players.get(serverPlayer.id);
      if (!gamePlayer) {
        return;
      }

      const edge = this.graph.edges[serverPlayer.harvester.position.edgeIndex];
      const segment = getSegment(edge, serverPlayer.harvester.position.at);

      // Assign, а не спред, т.к. нельзя ссылку менять (хранится в рендере)
      Object.assign(gamePlayer.harvester, serverPlayer.harvester, {
        position: {
          ...gamePlayer.harvester.position,
          ...serverPlayer.harvester.position,
          edge,
          coords: segment.coords,
        },
      });

      gamePlayer.score = serverPlayer.score;
    });

    this.render.map.setCenter(projectMapToGeo(this.state.currentPlayer.harvester.position.coords));
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

    const harvester = this.state.currentPlayer.harvester;
    const path = pathFindFromMidway(harvester.position, toPosition);
    if (!path) {
      return;
    }

    drawRoute(this.render.map, harvester.position, path, toPosition);

    return cmd.sendMsg(msg.newRoute(harvester.position, path, toPosition));
  }

  private gameLoop = () => {
    requestAnimationFrame(this.gameLoop);

    const time = Date.now();
    this.state.prevTime = this.state.time;
    this.state.time = time;

    this.mouseZoom.update();
    this.mousePitchRotate.update();
    this.touchZoomRotate.update();

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
  let nearest: { edge: ClientGraphEdge; segmentIndex: number; positionAtSegment: number; coords: number[] } | undefined;

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
          positionAtSegment: closestPoint.t,
          coords: closestPoint.point,
        };
      }
    }
  });

  if (nearest) {
    const position: Position = {
      edge: nearest.edge,
      segmentIndex: nearest.segmentIndex,
      positionAtSegment: nearest.positionAtSegment,
      coords: nearest.coords,
      at: getAtFromSegment(nearest.edge, nearest.positionAtSegment, nearest.segmentIndex),
    };
    return position;
  }
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
