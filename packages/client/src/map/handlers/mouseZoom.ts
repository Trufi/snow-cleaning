import { clamp, sign, throttle } from '@trufi/utils';

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const config = {
  mouseDelta: 0.65,
  macTouchDelta: 0.0018,

  animDuration: 400,
  throttleDelay: 100,
};

export class MouseZoom {
  private eventCount: number;
  private deltaAccumulator: number;

  constructor(private map: mapgl.Map, private container: HTMLElement) {
    // Добавляем троттлинг для анимации
    // Сейчас считаем, что мак = инерциальный скроллинг
    if (!isMac) {
      this.startZooming = throttle(this.startZooming, config.throttleDelay);
    }

    this.deltaAccumulator = 0;
    this.eventCount = 0;
    this.container.addEventListener('wheel', this.onWheelScroll);
  }

  public destroy() {
    this.container.removeEventListener('wheel', this.onWheelScroll);
  }

  public update() {
    if (this.eventCount === 0) {
      return;
    }

    this.startZooming();
  }

  /**
   * Событие на изменение позиции скролла
   */
  private onWheelScroll = (ev: WheelEvent) => {
    ev.preventDefault();

    // https://jira.2gis.ru/browse/TILES-2038
    // Firefox иногда первым событием шлет undefined данные.
    // Воспроизвести не удалось, но в слаке от пользователя был скрин где эти поля undefined.
    // https://rnd2gis.slack.com/files/UF17ZDYF5/FJ70E6JQ6/image.png
    if (ev.deltaMode === undefined && ev.deltaY === undefined) {
      return;
    }

    // ctrlKey == true сигнализирует о том, что выполняется жест pinch на тачпаде
    // https://medium.com/@auchenberg/detecting-multi-touch-trackpad-gestures-in-javascript-a2505babb10e
    // по сравнению с обычной ситуацией, его нужно немного ускорить
    if (ev.ctrlKey) {
      this.deltaAccumulator -= ev.deltaY * 10;

      // В FF под маком на скролл мыши вызывается событие
      // с deltaMode = 1 (разница в строках, а не пикслеях)
      // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
    } else if (ev.deltaMode === 1) {
      this.deltaAccumulator -= ev.deltaY * 20;

      // обычная ситуация
    } else {
      this.deltaAccumulator -= ev.deltaY;
    }

    this.eventCount += 1;
  };

  private getDelta() {
    // Вычисляем среднюю дельту накопленных сообщений
    const delta = this.deltaAccumulator / this.eventCount;

    // Обнуляем счётчики
    this.deltaAccumulator = 0;
    this.eventCount = 0;

    return delta;
  }

  private startZooming = () => {
    let deltaZoom;

    if (isMac) {
      deltaZoom = this.getDelta() * config.macTouchDelta;
    } else {
      deltaZoom = sign(this.getDelta()) * config.mouseDelta;
    }

    const zoom = this.map.getZoom();
    const targetZoom = zoom + deltaZoom;
    const clampedZoom = clamp(targetZoom, this.map.getMinZoom(), this.map.getMaxZoom());

    if (clampedZoom === zoom) {
      return;
    }
    if (isMac) {
      this.map.setZoom(clampedZoom, { animate: false });
    } else {
      this.map.setZoom(clampedZoom, { duration: config.animDuration, easing: 'easeOutCubic' });
    }
  };
}
