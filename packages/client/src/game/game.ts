import { ClientGraph } from '@game/data/clientGraph';
import { pathFindFromMidway } from '@game/utils/pathfind';
import { ServerMsg } from '@game/server/messages';
import { mapMap } from '@game/utils';
import { projectGeoToMap, projectMapToGeo } from '@game/utils/geo';
import { Harvester } from '@game/utils/harvester';
import { cmd, Cmd, union } from '../commands';
import { drawMarker, drawRoute } from '../map/drawRoute';
import { Render } from '../map/render';
import { msg } from '../messages';
import { getTime } from '../utils';
import { MouseZoom } from '../map/handlers/mouseZoom';
import { MousePitchRotate } from '../map/handlers/mousePitchRotate';
import { TouchZoomRotate } from '../map/handlers/touchZoomRotate';
import { ServerTime } from './serverTime';
import { InterpolatedHarvester } from './interpolatedHarvester';
import { RenderUIFunction } from '../ui/renderUI';
import { VertexFinder } from './vertexFinder';

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
  private mouseZoom: MouseZoom;
  private mousePitchRotate: MousePitchRotate;
  private touchZoomRotate: TouchZoomRotate;
  private serverTime: ServerTime;
  private vertexFinder: VertexFinder;
  private isMouseDown = false;

  constructor(
    private graph: ClientGraph,
    private render: Render,
    private renderUI: RenderUIFunction,
    startData: ServerMsg['startData'],
  ) {
    const time = getTime();

    this.serverTime = new ServerTime(time);
    this.vertexFinder = new VertexFinder(graph);

    startData.enabledEdges.forEach((edgeIndex) => {
      this.graph.edges[edgeIndex].enabled = true;
    });

    const players: GameState['players'] = new Map();
    startData.players.forEach((player) => {
      const harvesterData = {
        ...player.harvester,
        score: player.score,
        edge: this.graph.edges[player.harvester.edgeIndex],
      };

      if (player.id !== startData.playerId) {
        const gamePlayer: GamePlayer = {
          id: player.id,
          name: player.name,
          score: player.score,
          harvester: new InterpolatedHarvester(this.serverTime, harvesterData),
        };
        players.set(player.id, gamePlayer);
      } else {
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
      if (!this.isMouseDown) {
        return;
      }
      this.state.lastGoToPoint = projectGeoToMap(this.render.map.unproject([ev.clientX, ev.clientY]));
      const toPosition = this.vertexFinder.findNearest(this.state.lastGoToPoint);
      if (toPosition) {
        drawMarker(this.render.map, toPosition.coords);
      }
    };
    handlerContainer.addEventListener('mousemove', handleMouseEvent);
    handlerContainer.addEventListener('mousedown', () => (this.isMouseDown = true));
    handlerContainer.addEventListener('mouseup', () => (this.isMouseDown = false));
    handlerContainer.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.state.lastGoToPoint = projectGeoToMap(this.render.map.unproject([ev.clientX, ev.clientY]));
      const toPosition = this.vertexFinder.findNearest(this.state.lastGoToPoint);
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

    const harvesterData = {
      ...player.harvester,
      score: player.score,
      edge: this.graph.edges[player.harvester.edgeIndex],
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
        harvester.addStep(data.time, this.graph.edges[edgeIndex], at);
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

    this.state.players.forEach(({ harvester }) => harvester.updateMoving(time));

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
    const toPosition = this.vertexFinder.findNearest(this.state.lastGoToPoint);
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
