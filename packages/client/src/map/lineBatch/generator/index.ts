import { SnowClientGraphEdge } from '@game/utils/types';
import { Bucket } from './bucket';
import { line } from './line';

export { Bucket };

export interface GeneratorEdgeData {
  px: number[];
  py: number[];
  colors: Array<number[]>;
  edge: SnowClientGraphEdge;
}

export interface GeneratorData {
  bucket: Bucket;
  edges: GeneratorEdgeData[];
  indexLength: number;
  elementsLength: number;
}

export const lineStride = 16;

function lineBinder(bucket: Bucket, buffer: ArrayBuffer) {
  bucket.position = new Float32Array(buffer);
  bucket.extender = new Int8Array(buffer, 8);
  bucket.normal = new Int8Array(buffer, 10);
  bucket.color = new Uint8Array(buffer, 12);
}

function isOverloaded(buckets: Bucket[]): boolean {
  let count = 0;
  let i = 0;

  while (i < buckets.length) {
    count = count + buckets[i++].checkWatermarks();
  }

  const result = count > 0;

  if (result) {
    while (i--) {
      buckets[i].rollback();
    }
  } else {
    while (i--) {
      buckets[i].commit();
    }
  }

  return result;
}

export function createEmptyGeneratorData(): GeneratorData {
  return {
    bucket: new Bucket(lineBinder, lineStride),
    edges: [],
    elementsLength: 0,
    indexLength: 0,
  };
}

export function generate(data: GeneratorData) {
  const { bucket, edges } = data;

  for (const { px, py, colors } of edges) {
    do {
      line(bucket, px, py, colors);
    } while (isOverloaded([bucket]));
  }

  data.elementsLength = bucket.elements.offset;
  data.indexLength = bucket.indices.offset;

  bucket.resetOffsets();
}
