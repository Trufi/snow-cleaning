import RBush from 'rbush';
import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { ServerMsg } from '@game/server/messages';
import { getClosestPointOnLineSegment, mapMap } from '@game/utils';
import { projectGeoToMap, projectMapToGeo } from '@game/utils/geo';
import { vec2dist } from '@game/utils/vec2';
import { cmd, Cmd, union } from '../commands';
import { drawMarker, drawRoute } from '../map/drawRoute';
import { Render } from '../map/render';
import { msg } from '../messages';
import { pathFindFromMidway } from './pathfind';
import { Position } from '../types';
import { getAtFromSegment, getSegment, getTime } from '../utils';
import { MouseZoom } from '../map/handlers/mouseZoom';
import { MousePitchRotate } from '../map/handlers/mousePitchRotate';
import { TouchZoomRotate } from '../map/handlers/touchZoomRotate';
import { ServerTime } from './serverTime';
import { createHarvester, Harvester, updateHarvester } from './harvester';
import { PlayerHarvester } from './liveHarvester';
import { RenderUIFunction } from '../ui/renderUI';

export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  harvester: Harvester | PlayerHarvester;
}

export interface CurrentGamePlayer {
  id: string;
  name: string;
  score: number;
  harvester: PlayerHarvester;
}

export interface GameState {
  prevTime: number;
  time: number;

  lastGoToPointUpdateTime: number;
  lastGoToPoint: number[] | undefined;

  players: Map<string, GamePlayer>;
  currentPlayer: CurrentGamePlayer;
}

export class Game {
  private state: GameState;
  private graphVerticesTree: RBush<{ vertex: ClientGraphVertex }>;
  private mouseZoom: MouseZoom;
  private mousePitchRotate: MousePitchRotate;
  private touchZoomRotate: TouchZoomRotate;
  private serverTime: ServerTime;

  constructor(
    private graph: ClientGraph,
    private render: Render,
    private renderUI: RenderUIFunction,
    startData: ServerMsg['startData'],
  ) {
    const time = getTime();

    startData.enabledEdges.forEach((edgeIndex) => {
      this.graph.edges[edgeIndex].enabled = true;
    });

    const players: GameState['players'] = new Map();
    startData.players.forEach((player) => {
      if (player.id !== startData.playerId) {
        const gamePlayer: GamePlayer = {
          id: player.id,
          name: player.name,
          score: player.score,
          harvester: createHarvester(this.graph, player.harvester),
        };
        players.set(player.id, gamePlayer);
      } else {
        const gamePlayer: CurrentGamePlayer = {
          id: player.id,
          name: player.name,
          score: player.score,
          harvester: new PlayerHarvester(this.graph, player.harvester),
        };
        players.set(player.id, gamePlayer);
      }
    });

    this.state = {
      prevTime: time,
      time,
      players,
      currentPlayer: players.get(startData.playerId) as CurrentGamePlayer, // TODO: обработать бы

      lastGoToPoint: undefined,
      lastGoToPointUpdateTime: time,
    };

    this.graphVerticesTree = new RBush();
    this.graphVerticesTree.load(this.graph.vertices.map((vertex) => createPoint(vertex.coords, vertex)));

    this.updatePointsSize();

    this.render.setLines(this.graph.edges, this.graph.min, this.graph.max);

    const handlerContainer = document.getElementById('bbb') as HTMLElement;
    this.mouseZoom = new MouseZoom(this.render.map, handlerContainer);
    this.mousePitchRotate = new MousePitchRotate(this.render.map, handlerContainer);
    this.touchZoomRotate = new TouchZoomRotate(this.render.map, handlerContainer);

    const handleMouseEvent = (ev: MouseEvent) => {
      this.state.lastGoToPoint = projectGeoToMap(this.render.map.unproject([ev.clientX, ev.clientY]));
      const toPosition = findNearestGraphVertex(this.graph, this.graphVerticesTree, this.state.lastGoToPoint);
      if (toPosition) {
        drawMarker(this.render.map, toPosition.coords);
      }
    };
    handlerContainer.addEventListener('mousemove', handleMouseEvent);

    handlerContainer.addEventListener('touchmove', (ev) => {
      if (ev.touches.length !== 1) {
        return;
      }
      ev.preventDefault();
      const touch = ev.touches[0];
      this.state.lastGoToPoint = projectGeoToMap(this.render.map.unproject([touch.clientX, touch.clientY]));
    });
    handlerContainer.addEventListener('touchend', (ev) => {
      if (ev.touches.length > 0 && ev.changedTouches.length !== 1) {
        return;
      }
      ev.preventDefault();
      const touch = ev.changedTouches[0];
      this.state.lastGoToPoint = projectGeoToMap(this.render.map.unproject([touch.clientX, touch.clientY]));
    });

    this.serverTime = new ServerTime(time);
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
      const {
        score,
        harvester: { edgeIndex, at },
      } = serverPlayer;

      gamePlayer.score = score;

      const edge = this.graph.edges[edgeIndex];
      const { coords } = getSegment(edge, at);
      if (gamePlayer.harvester.type === 'player') {
        // gamePlayer.harvester.steps.push({
        //   time: data.time,
        //   coords,
        //   edge,
        //   at,
        // });
      } else {
        gamePlayer.harvester.steps.push({
          time: data.time,
          coords,
        });
      }
    });

    this.renderUI({ type: 'inGame', state: this.state, serverTime: this.serverTime });
  }

  public updatePollutionFromServer(data: ServerMsg['pollutionData']) {
    for (const key in data.changedEdges) {
      const index = Number(key);
      this.graph.edges[index].pollution = data.changedEdges[key];
    }

    this.render.updateLines(this.graph.edges);
  }

  public update(): Cmd {
    const time = getTime();
    this.state.prevTime = this.state.time;
    this.state.time = time;

    const cmds: Cmd[] = [];

    cmds.push(this.serverTime.update(time));

    this.state.players.forEach((player) => {
      if (player.harvester.type === 'player') {
        player.harvester.update(time);
      } else {
        updateHarvester(time, this.serverTime, player.harvester);
      }
    });

    this.render.map.setCenter(projectMapToGeo(this.state.currentPlayer.harvester.getCoords()));

    this.mouseZoom.update();
    this.mousePitchRotate.update();
    this.touchZoomRotate.update();

    this.render.render();

    if (time - this.state.lastGoToPointUpdateTime > 300) {
      cmds.push(this.goToPoint());
    }

    return union(cmds);
  }

  public updatePingAndServerTime(serverMsg: ServerMsg['pong']) {
    this.serverTime.updatePingAndServerTime(this.state.time, serverMsg);
  }

  private goToPoint(): Cmd {
    if (!this.state.lastGoToPoint) {
      return;
    }
    const toPosition = findNearestGraphVertex(this.graph, this.graphVerticesTree, this.state.lastGoToPoint);
    this.state.lastGoToPoint = undefined;
    if (!toPosition) {
      return;
    }

    const harvester = this.state.currentPlayer.harvester;
    const path = pathFindFromMidway(harvester.getPosition(), toPosition);
    if (!path) {
      return;
    }

    drawRoute(this.render.map, harvester.getPosition(), path, toPosition);

    harvester.setRoute(this.state.time, harvester.getPosition().at, path, toPosition.at);

    const serverTime = this.state.time - this.serverTime.getDiff();
    return cmd.sendMsg(msg.newRoute(serverTime, harvester.getPosition().at, path, toPosition.at));
  }

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
