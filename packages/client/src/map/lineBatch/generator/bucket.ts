export type BucketBinder = (bucket: Bucket, buffer: ArrayBuffer) => void;

const WATERMARK_FACTOR = 0.8;

export class ElementsObject {
  public watermark: number;
  public comittedOffsets = 0;
  public buffer: ArrayBuffer;
  public view: Int32Array;
  public offset = 0;

  constructor(length: number, public stride: number) {
    this.buffer = new ArrayBuffer(length);
    this.view = new Int32Array(this.buffer);
    this.watermark = (length / stride) * WATERMARK_FACTOR;
  }

  public extend() {
    const newSize = this.buffer.byteLength * 2;
    this.watermark = (newSize / this.stride) * WATERMARK_FACTOR;

    const buffer = new ArrayBuffer(newSize);
    const view = new Int32Array(buffer);

    view.set(this.view);

    this.buffer = buffer;
    this.view = view;

    return buffer;
  }
}

export class IndicesObject {
  public watermark: number;
  public comittedOffsets = 0;
  public buffer: Int32Array;
  public offset = 0;

  constructor(elements: number) {
    this.buffer = new Int32Array(elements);
    this.watermark = elements * WATERMARK_FACTOR;
  }

  public extend() {
    const newSize = this.buffer.length * 2;
    this.watermark = newSize * WATERMARK_FACTOR;

    const buffer = new Int32Array(newSize);
    buffer.set(this.buffer);
    this.buffer = buffer;
  }
}

export class Bucket {
  public elements: ElementsObject;
  public indices: IndicesObject;
  [elementsBufferViewName: string]: any;
  private binder: BucketBinder;

  constructor(binder: BucketBinder, stride: number) {
    const initialBufferLength = 67200;
    this.elements = new ElementsObject(initialBufferLength, stride);
    this.indices = new IndicesObject((initialBufferLength * 2) / stride);
    this.binder = binder;
    binder(this, this.elements.buffer);
  }

  public resetOffsets() {
    this.elements.offset = 0;
    this.elements.comittedOffsets = 0;

    this.indices.offset = 0;
    this.indices.comittedOffsets = 0;
  }

  public commit() {
    this.elements.comittedOffsets = this.elements.offset;
    this.indices.comittedOffsets = this.indices.offset;
  }

  public rollback() {
    this.elements.offset = this.elements.comittedOffsets;
    this.indices.offset = this.indices.comittedOffsets;
  }

  public checkWatermarks() {
    let result = 0;

    const elements = this.elements;
    if (elements.offset > elements.watermark) {
      if (elements.offset >= elements.buffer.byteLength / elements.stride) {
        result = 1;
      }
      this.binder(this, elements.extend());
    }

    const indices = this.indices;
    if (indices.offset > indices.watermark) {
      if (indices.offset >= indices.buffer.length) {
        result = 1;
      }
      indices.extend();
    }

    return result;
  }
}
