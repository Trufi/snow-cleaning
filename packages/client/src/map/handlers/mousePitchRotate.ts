import { radToDeg } from '@trufi/utils';
import { getMousePosition, normalizeMousePosition } from '../../utils';

const config = {
  mouseRotateDelta: 2.5,
  mousePitchDelta: 2.5,
};

export class MousePitchRotate {
  private isMouseDown: boolean;
  private mouseMovePoint: number[];
  private mouseDownPoint: number[];
  private isMouseMove: boolean;

  constructor(private map: mapgl.Map, private container: HTMLElement) {
    this.isMouseDown = false;
    this.isMouseMove = false;
    this.mouseDownPoint = [0, 0];
    this.mouseMovePoint = [0, 0];
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mouseleave', this.onMouseLeave);
  }

  public update() {
    if (!this.isMouseMove) {
      return;
    }

    if (this.mouseDownPoint[0] === 0 && this.mouseDownPoint[1] === 0) {
      this.mouseDownPoint = this.mouseMovePoint;
    }

    const size = this.map.getSize();
    const mouseDown = normalizeMousePosition(size, this.mouseDownPoint);
    const mouseMove = normalizeMousePosition(size, this.mouseMovePoint);

    const rotateAngle = radToDeg((mouseDown[0] - mouseMove[0]) * config.mouseRotateDelta);
    const pitchAngle = radToDeg((mouseMove[1] - mouseDown[1]) * config.mousePitchDelta);

    this.map.setRotation(this.map.getRotation() + rotateAngle, { animate: false });
    this.map.setPitch(this.map.getPitch() + pitchAngle, { animate: false });

    this.mouseDownPoint = this.mouseMovePoint;

    this.isMouseMove = false;
  }

  private onMouseDown = (ev: MouseEvent) => {
    if (this.isMouseDown || !isAllowedMouseButton(ev)) {
      return;
    }

    this.mouseDownPoint = getMousePosition(this.container, ev.clientX, ev.clientY);
    this.enableHandler();
  };

  private onMouseUp = () => {
    if (!this.isMouseDown) {
      return;
    }

    this.disableHandler();
  };

  private onMouseLeave = () => {
    if (this.isMouseDown) {
      this.disableHandler();
    }
  };

  private onMouseMove = (ev: MouseEvent) => {
    if (!this.isMouseDown) {
      return;
    }

    this.mouseMovePoint = getMousePosition(this.container, ev.clientX, ev.clientY);

    this.isMouseMove = true;
  };

  private enableHandler() {
    this.isMouseDown = true;
  }

  private disableHandler() {
    this.isMouseDown = false;
  }
}

function isAllowedMouseButton(e: MouseEvent): boolean {
  // ctrl+leftBuffton || middleButton || rightButton
  return (e.button === 0 && (e.ctrlKey || e.metaKey)) || e.button === 1 || e.button === 2;
}
