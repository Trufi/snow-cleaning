import { ClientGraph, ClientGraphEdge } from '@game/data/clientGraph';
import { PlayerData } from '@game/server/messages';
// import { lerp } from '@game/utils';
// import { vec2lerp } from '@game/utils/vec2';
import { getSegment } from '../utils';
import { ServerTime } from './serverTime';

export interface PlayerHarvesterPosition {
  edge: ClientGraphEdge;
  at: number;
}

export interface PlayerHarvesterStep {
  time: number;
  edge: ClientGraphEdge;
  at: number;
  coords: number[];
}

export interface PlayerHarvester {
  type: 'player';
  speed: number;
  coords: number[];
  position: PlayerHarvesterPosition;
  steps: PlayerHarvesterStep[];
}

export function createPlayerHarvester(graph: ClientGraph, serverHarvester: PlayerData['harvester']) {
  const edge = graph.edges[serverHarvester.edgeIndex];
  const { coords } = getSegment(edge, serverHarvester.at);
  const harvester: PlayerHarvester = {
    type: 'player',
    speed: serverHarvester.speed,
    coords,
    position: {
      at: serverHarvester.at,
      edge,
    },
    steps: [],
  };
  return harvester;
}

export function updatePlayerHarvester(_time: number, _serverTime: ServerTime, harvester: PlayerHarvester) {
  // const interpolationTime = time - serverTime.getDiff() - serverTime.getInterpolateTimeShift();

  // const startIndex = findStepInterval(interpolationTime, harvester.steps);
  // if (startIndex === -1) {
  //   return;
  // }

  // const startStep = harvester.steps[startIndex];
  // const endStep = harvester.steps[startIndex + 1];

  // С сервера всегда приходит последний стейт, поэтому они могут повторятся,
  // если у другого игрока зависла игра
  // if (startStep.time - endStep.time !== 0) {
  //   // Чистим массив от старых steps
  //   harvester.steps.splice(0, startIndex);

  //   const t = (interpolationTime - startStep.time) / (endStep.time - startStep.time);
  //   vec2lerp(harvester.coords, startStep.coords, endStep.coords, t);

  //   harvester.position.edge = endStep.edge;
  //   if (startStep.edge === endStep.edge) {
  //     lerp(harvester.position.at, startStep.at, endStep.at);
  //   } else {
  //     harvester.position.at = endStep.at;
  //   }
  // }
  harvester.steps.splice(0, harvester.steps.length - 1);
  const latestStep = harvester.steps[0];
  if (latestStep) {
    harvester.coords = latestStep.coords;
    harvester.position.edge = latestStep.edge;
    harvester.position.at = latestStep.at;
  }
}
