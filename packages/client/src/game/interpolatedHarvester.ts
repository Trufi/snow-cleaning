import { vec2lerp } from '@trufi/utils';
import { ServerTime } from './serverTime';

export interface InterpolatedHarvesterStep {
  time: number;
  coords: number[];
}

export interface InterpolatedHarvesterInitialData {
  coords: number[];
  speed: number;
  color: number;
  score: number;
}

export class InterpolatedHarvester {
  public readonly color: number;
  private score: number;
  private coords: number[];

  private steps: InterpolatedHarvesterStep[] = [];

  constructor(private serverTime: ServerTime, data: InterpolatedHarvesterInitialData) {
    this.coords = data.coords;
    this.color = data.color;
    this.score = data.score;
  }

  public getScore() {
    return this.score;
  }

  public getCoords() {
    return this.coords;
  }

  public addStep(time: number, coords: number[]) {
    this.steps.push({ time, coords });
  }

  public updateMoving(time: number) {
    const interpolationTime = time - this.serverTime.getDiff() - this.serverTime.getInterpolateTimeShift();

    const startIndex = findStepInterval(interpolationTime, this.steps);
    if (startIndex === -1) {
      return;
    }

    const startStep = this.steps[startIndex];
    const endStep = this.steps[startIndex + 1];

    // С сервера всегда приходит последний стейт, поэтому они могут повторятся,
    // если у другого игрока зависла игра
    if (startStep.time - endStep.time !== 0) {
      // Чистим массив от старых steps
      this.steps.splice(0, startIndex);

      const t = (interpolationTime - startStep.time) / (endStep.time - startStep.time);
      vec2lerp(this.coords, startStep.coords, endStep.coords, t);
    }
  }
}

/**
 * Возвращает индекс стартового элемента в steps
 * Конечный элемент будет i + 1
 */
function findStepInterval(time: number, steps: Array<{ time: number }>): number {
  // Считаем, что массив отсортирован по возрастанию time
  for (let i = steps.length - 2; i >= 0; i--) {
    const step = steps[i];
    if (step.time <= time) {
      return i;
    }
  }
  return -1;
}
