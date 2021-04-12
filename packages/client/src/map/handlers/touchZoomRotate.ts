import { radToDeg } from '@game/utils';
import { projectGeoToMap } from '@game/utils/geo';
import { getMousePosition } from '../../utils';

const config = {
  mobileDelta: 1,
};

export class TouchZoomRotate {
  private touchMovePoints: number[][];
  private isTouchStart: boolean;
  private touchStartPoints: number[][];
  private isTouchMove: boolean;

  constructor(private map: mapgl.Map, private container: HTMLElement) {
    this.isTouchStart = false;
    this.isTouchMove = false;
    this.touchMovePoints = [];
    this.touchStartPoints = [];
    this.container.addEventListener('touchstart', this.onTouchStart);
    this.container.addEventListener('dragstart', this.preventDefault);
    this.container.addEventListener('drag', this.preventDefault);
    this.container.addEventListener('dragend', this.preventDefault);
    this.container.addEventListener('contextmenu', this.preventDefault);
  }

  public update() {
    if (!this.isTouchMove) {
      return;
    }

    // zoom
    const scale = this.distance(this.touchMovePoints) / this.distance(this.touchStartPoints);
    const newZoom = this.map.getZoom() + (Math.log(scale) / Math.log(2)) * config.mobileDelta;

    // rotate
    const st1 = projectGeoToMap(this.map.unproject(this.touchStartPoints[0]));
    const st2 = projectGeoToMap(this.map.unproject(this.touchStartPoints[1]));

    const mt1 = projectGeoToMap(this.map.unproject(this.touchMovePoints[0]));
    const mt2 = projectGeoToMap(this.map.unproject(this.touchMovePoints[1]));

    let angle = 0;

    // Одна из переменных может быть null, если палец не попал в плоскость XY
    if (st1 && st2 && mt1 && mt2) {
      const startAngle = this.angle(st1, st2);
      const moveAngle = this.angle(mt1, mt2);

      angle = startAngle - moveAngle;
    }

    this.map.setZoom(newZoom, { animate: false });
    this.map.setRotation(this.map.getRotation() + radToDeg(angle), { animate: false });

    this.touchStartPoints = this.touchMovePoints;
    this.isTouchMove = false;
  }

  private onTouchStart = (ev: TouchEvent) => {
    ev.preventDefault();

    if (!ev.touches || ev.touches.length !== 2) {
      return;
    }

    this.touchStartPoints = [
      getMousePosition(this.container, ev.touches[0].clientX, ev.touches[0].clientY),
      getMousePosition(this.container, ev.touches[1].clientX, ev.touches[1].clientY),
    ];

    this.isTouchStart = true;
    document.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('touchmove', this.onTouchMove);
  };

  private onTouchEnd = (ev: TouchEvent) => {
    ev.preventDefault();

    this.isTouchStart = false;

    document.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('touchmove', this.onTouchMove);
  };

  private onTouchMove = (ev: TouchEvent) => {
    ev.preventDefault();

    if (!this.isTouchStart || !ev.touches || ev.touches.length !== 2) {
      return;
    }

    this.touchMovePoints = [
      getMousePosition(this.container, ev.touches[0].clientX, ev.touches[0].clientY),
      getMousePosition(this.container, ev.touches[1].clientX, ev.touches[1].clientY),
    ];

    this.isTouchMove = true;
  };

  private angle(a: number[], b: number[]) {
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }

  private distance(points: number[][]) {
    const a = points[0];
    const b = points[1];

    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
  }

  private preventDefault = (ev: Event) => {
    ev.preventDefault();
  };
}
