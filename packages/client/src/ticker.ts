export class Ticker {
  private from = 0;
  private to = 0;
  private duration = 0;
  private startTime = 0;

  constructor() {}

  public start(time: number, from: number, to: number, duration: number) {
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.startTime = time;
  }

  public getValue(time: number) {
    const elapsedTime = time - this.startTime;

    if (elapsedTime >= this.duration) {
      return this.to;
    }

    return easeInOutQuad(elapsedTime, this.from, this.to - this.from, this.duration);
  }

  public getOptions() {
    return { from: this.from, to: this.to, duration: this.duration };
  }
}

function easeInOutQuad(t: number, b: number, c: number, d: number) {
  if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
  return (-c / 2) * (--t * (t - 2) - 1) + b;
}
