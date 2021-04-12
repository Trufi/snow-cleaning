export const mapMap = <K, V, R>(m: Map<K, V>, cb: (v: V, k: K) => R): R[] => {
  const res: R[] = [];
  m.forEach((v, k) => res.push(cb(v, k)));
  return res;
};

export const mapToArray = <K, V>(m: Map<K, V>): V[] => {
  return mapMap(m, (v) => v);
};

export const findMap = <K, V>(m: Map<K, V>, cb: (v: V, k: K) => boolean): V | undefined => {
  for (const [k, v] of m) {
    const res = cb(v, k);
    if (res) {
      return v;
    }
  }
};

export function clamp(value: number, min: number, max: number) {
  value = Math.max(value, min);
  value = Math.min(value, max);
  return value;
}

export function sign(x: number) {
  x = +x; // convert to a number
  if (x === 0 || Number.isNaN(x)) {
    return x; // 0, -0 or NaN
  }
  return x > 0 ? 1 : -1;
}

export const lerp = (a: number, b: number, t: number) => a + t * (b - a);

export const pick = <T extends { [key: string]: any }, K extends keyof T>(obj: T, targetProps: K[]): Pick<T, K> => {
  const targetObj = {} as Pick<T, K>;
  for (let i = 0; i < targetProps.length; i++) {
    targetObj[targetProps[i]] = obj[targetProps[i]];
  }
  return targetObj;
};

export type ObjectElement<T> = T[keyof T];
export type ArrayElement<ArrayType> = ArrayType extends Array<infer ElementType> ? ElementType : never;

export function createRandomFunction(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function round(x: number, digit: number) {
  return Math.round(x * 10 ** digit) / 10 ** digit;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians / Math.PI) * 180;
}

export function getClosestPointOnLineSegment(point: number[], point1: number[], point2: number[]) {
  const A = point[0] - point1[0];
  const B = point[1] - point1[1];
  const C = point2[0] - point1[0];
  const D = point2[1] - point1[1];

  const dot = A * C + B * D;
  const lengthSquared = C * C + D * D;
  const param = lengthSquared !== 0 ? dot / lengthSquared : 0;

  if (param < 0) {
    return {
      type: 'first' as const,
      point: point1,
      t: 0,
    };
  } else if (param > 1) {
    return {
      type: 'second' as const,
      point: point2,
      t: 1,
    };
  } else {
    return {
      type: 'new' as const,
      point: [Math.round(point1[0] + param * C), Math.round(point1[1] + param * D)],
      t: param,
    };
  }
}

export function throttle(fn: (...args: any[]) => void, time: number) {
  let lock: any;
  let savedArgs: any;

  function later() {
    // reset lock and call if queued
    lock = false;
    if (savedArgs) {
      wrapperFn(...savedArgs);
      savedArgs = false;
    }
  }

  function wrapperFn(...args: any[]) {
    if (lock) {
      // called too soon, queue to call later
      savedArgs = args;
    } else {
      // call and lock until later
      fn(...args);
      setTimeout(later, time);
      lock = true;
    }
  }

  return wrapperFn;
}
