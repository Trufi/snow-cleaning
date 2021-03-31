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
