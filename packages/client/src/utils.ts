export function createRandomFunction(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function getCircleIcon(color: string, radius: number, color2 = '#000', radius2 = 0): string {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${
    radius * 2
  } ${radius * 2}">
      <circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/>
      <circle fill="${color2}" cx="${radius}" cy="${radius}" r="${radius2}"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(icon)}`;
}

export function normalizeMousePosition(size: Vec2, point: Vec2): Vec2 {
  return [(point[0] / size[0]) * 2 - 1, -(point[1] / size[1]) * 2 + 1];
}

/**
 * Возвращает координаты мыши относительно верхнего левого угла container
 * за вычетом ширины границ.
 */
export function getMousePosition(container: HTMLElement, clientX: number, clientY: number): number[] {
  const rect = container.getBoundingClientRect();
  return [clientX - rect.left - container.clientLeft, clientY - rect.top - container.clientTop];
}

/**
 * Т.к. на сервер время считается от старта,
 * то на клиенте делаем что-то похожее, чтобы сильно большой разница не была
 */
const startTime = Date.now();
export function getTime() {
  return Date.now() - startTime;
}

/**
 * Возвращает индекс стартового элемента в steps
 * Конечный элемент будет i + 1
 */
export function findStepInterval(time: number, steps: Array<{ time: number }>): number {
  // Считаем, что массив отсортирован по возрастанию time
  for (let i = steps.length - 2; i >= 0; i--) {
    const step = steps[i];
    if (step.time <= time) {
      return i;
    }
  }
  return -1;
}
