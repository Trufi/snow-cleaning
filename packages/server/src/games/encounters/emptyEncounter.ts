import { Roads } from '@trufi/roads';

export class EmptyEncounter {
  public readonly type = 'empty' as const;
  public readonly duration = 10 * 1000;

  constructor(
    public readonly startTime: number,
    _roads: Roads,

    private onFinish: () => void,
  ) {}

  public getReadyPercent() {
    return 1;
  }

  public getTimeLeft(time: number) {
    const timeSpent = time - this.startTime;
    return this.duration - timeSpent;
  }

  public update(time: number) {
    const timeSpent = time - this.startTime;
    if (timeSpent > this.duration) {
      this.onFinish();
    }
  }
}
