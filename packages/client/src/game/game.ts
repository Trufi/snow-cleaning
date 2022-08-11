import { ServerMsg } from '@game/server/messages';
import { Harvester, HarvesterInitialData } from '@game/utils/harvester';
import { SnowClientGraph } from '@game/utils/types';
import { DataGraph, pathfindFromMidway, Roads } from '@trufi/roads';
import { mapMap, mapPointFromLngLat, mapPointToLngLat } from '@trufi/utils';
import { cmd, Cmd, union } from '../commands';
import { drawMarker, drawRoute } from '../map/drawRoute';
import { MousePitchRotate } from '../map/handlers/mousePitchRotate';
import { MouseZoom } from '../map/handlers/mouseZoom';
import { TouchZoomRotate } from '../map/handlers/touchZoomRotate';
import { Render } from '../map/render';
import { msg } from '../messages';
import { RenderUIFunction } from '../ui/renderUI';
import { getTime } from '../utils';
import { InterpolatedHarvester, InterpolatedHarvesterInitialData } from './interpolatedHarvester';
import { ServerTime } from './serverTime';

const vertexSearchingMinDistance = 131072;

export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  harvester: InterpolatedHarvester | Harvester;
}

export interface CurrentGamePlayer {
  id: string;
  name: string;
  score: number;
  harvester: Harvester;
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
  private roads: Roads;
  private graph: SnowClientGraph;
  private mouseZoom: MouseZoom;
  private mousePitchRotate: MousePitchRotate;
  private touchZoomRotate: TouchZoomRotate;
  private serverTime: ServerTime;
  private isMouseDown = false;

  constructor(
    dataGraph: DataGraph,
    private render: Render,
    private renderUI: RenderUIFunction,
    startData: ServerMsg['startData'],
  ) {
    const time = getTime();

    this.roads = new Roads(dataGraph);
    this.graph = this.roads.graph;
    this.serverTime = new ServerTime(time);

    startData.enabledEdges.forEach((edgeIndex) => {
      this.graph.edges[edgeIndex].userData.enabled = true;
    });

    const players: GameState['players'] = new Map();
    startData.players.forEach((player) => {
      if (player.id !== startData.playerId) {
        const coords = this.roads.getPositionCoords({
          edge: this.graph.edges[player.harvester.edgeIndex],
          at: player.harvester.at,
        });

        const harvesterData: InterpolatedHarvesterInitialData = {
          ...player.harvester,
          score: player.score,
          coords,
        };
        const gamePlayer: GamePlayer = {
          id: player.id,
          name: player.name,
          score: player.score,
          harvester: new InterpolatedHarvester(this.serverTime, harvesterData),
        };
        players.set(player.id, gamePlayer);
      } else {
        const harvesterData: HarvesterInitialData = {
          ...player.harvester,
          score: player.score,
          edge: this.graph.edges[player.harvester.edgeIndex],
        };
        const gamePlayer: CurrentGamePlayer = {
          id: player.id,
          name: player.name,
          score: player.score,
          harvester: new Harvester(harvesterData),
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

    this.updatePointsSize();

    this.render.setLines(this.graph.edges, this.graph.min, this.graph.max);

    const handlerContainer = document.getElementById('bbb') as HTMLElement;
    this.mouseZoom = new MouseZoom(this.render.map, handlerContainer);
    this.mousePitchRotate = new MousePitchRotate(this.render.map, handlerContainer);
    this.touchZoomRotate = new TouchZoomRotate(this.render.map, handlerContainer);

    const handleMouseEvent = (ev: MouseEvent) => {
      ev.preventDefault();
      if (!ev.ctrlKey && !this.isMouseDown) {
        return;
      }
      this.state.lastGoToPoint = mapPointFromLngLat(this.render.map.unproject([ev.clientX, ev.clientY]));
      const toPosition = this.roads.findNearestVertex(this.state.lastGoToPoint, vertexSearchingMinDistance);
      if (toPosition) {
        drawMarker(this.render.map, toPosition.coords);
      }
    };
    handlerContainer.addEventListener('mousemove', handleMouseEvent);
    handlerContainer.addEventListener('mousedown', () => (this.isMouseDown = true));
    handlerContainer.addEventListener('mouseup', () => (this.isMouseDown = false));
    handlerContainer.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.state.lastGoToPoint = mapPointFromLngLat(this.render.map.unproject([ev.clientX, ev.clientY]));
      const toPosition = this.roads.findNearestVertex(this.state.lastGoToPoint, vertexSearchingMinDistance);
      if (toPosition) {
        drawMarker(this.render.map, toPosition.coords);
      }
    });

    handlerContainer.addEventListener('touchmove', (ev) => {
      if (ev.touches.length !== 1) {
        return;
      }
      ev.preventDefault();
      const touch = ev.touches[0];
      this.state.lastGoToPoint = mapPointFromLngLat(this.render.map.unproject([touch.clientX, touch.clientY]));
    });
    handlerContainer.addEventListener('touchend', (ev) => {
      if (ev.touches.length > 0 && ev.changedTouches.length !== 1) {
        return;
      }
      ev.preventDefault();
      const touch = ev.changedTouches[0];
      this.state.lastGoToPoint = mapPointFromLngLat(this.render.map.unproject([touch.clientX, touch.clientY]));
    });
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

    const coords = this.roads.getPositionCoords({
      edge: this.graph.edges[player.harvester.edgeIndex],
      at: player.harvester.at,
    });

    const harvesterData: InterpolatedHarvesterInitialData = {
      ...player.harvester,
      score: player.score,
      coords,
    };

    const gamePlayer: GamePlayer = {
      id: player.id,
      name: player.name,
      score: player.score,
      harvester: new InterpolatedHarvester(this.serverTime, harvesterData),
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

      const { harvester } = gamePlayer;

      if (harvester instanceof InterpolatedHarvester) {
        const coords = this.roads.getPositionCoords({
          edge: this.graph.edges[edgeIndex],
          at,
        });
        harvester.addStep(data.time, coords);
      }
    });

    this.renderUI({ type: 'inGame', state: this.state, serverTime: this.serverTime });
  }

  public updatePollutionFromServer(data: ServerMsg['pollutionData']) {
    for (const key in data.changedEdges) {
      const index = Number(key);
      this.graph.edges[index].userData.pollution = data.changedEdges[key];
    }

    this.render.updateLines(this.graph.edges);
  }

  public update(): Cmd {
    const time = getTime();
    this.state.prevTime = this.state.time;
    this.state.time = time;

    const cmds: Cmd[] = [];

    cmds.push(this.serverTime.update(time));

    this.state.players.forEach(({ harvester }) => harvester.updateMoving(time));

    this.render.map.setCenter(mapPointToLngLat(this.state.currentPlayer.harvester.getCoords()));

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
    const toPosition = this.roads.findNearestVertex(this.state.lastGoToPoint, vertexSearchingMinDistance);
    this.state.lastGoToPoint = undefined;
    if (!toPosition) {
      return;
    }

    const harvester = this.state.currentPlayer.harvester;
    const route = pathfindFromMidway(harvester.getPosition(), toPosition);
    if (!route) {
      return;
    }

    drawRoute(this.render.map, route);

    harvester.setRoute(this.state.time, route);

    const serverTime = this.state.time - this.serverTime.getDiff();
    return cmd.sendMsg(msg.newRoute(serverTime, route));
  }

  private updatePointsSize() {
    this.render.setPoints(
      mapMap(this.state.players, (p) => p.harvester),
      this.graph.min,
      this.graph.max,
    );
  }
}
