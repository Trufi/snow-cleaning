import { ClientGraph } from '@game/data/clientGraph';
import { vec2lerp } from '@game/utils/vec2';
import { getSegment } from '@game/utils/graph';
import { PlayerData } from '@game/server/messages';
import { findStepInterval } from '../utils';
import { ServerTime } from './serverTime';

export interface HarvesterStep {
  time: number;
  coords: number[];
}

export interface Harvester {
  type: 'interpolated';
  speed: number;
  coords: number[];
  steps: HarvesterStep[];
  color: number;
}

export function createHarvester(graph: ClientGraph, serverHarvester: PlayerData['harvester']) {
  const edge = graph.edges[serverHarvester.edgeIndex];
  const { coords } = getSegment(edge, serverHarvester.at);
  const harvester: Harvester = {
    type: 'interpolated',
    speed: serverHarvester.speed,
    coords,
    steps: [],
    color: serverHarvester.color,
  };
  return harvester;
}

export function updateHarvester(time: number, serverTime: ServerTime, harvester: Harvester) {
  const interpolationTime = time - serverTime.getDiff() - serverTime.getInterpolateTimeShift();

  const startIndex = findStepInterval(interpolationTime, harvester.steps);
  if (startIndex === -1) {
    return;
  }

  const startStep = harvester.steps[startIndex];
  const endStep = harvester.steps[startIndex + 1];

  // С сервера всегда приходит последний стейт, поэтому они могут повторятся,
  // если у другого игрока зависла игра
  if (startStep.time - endStep.time !== 0) {
    // Чистим массив от старых steps
    harvester.steps.splice(0, startIndex);

    const t = (interpolationTime - startStep.time) / (endStep.time - startStep.time);
    vec2lerp(harvester.coords, startStep.coords, endStep.coords, t);
  }
}
