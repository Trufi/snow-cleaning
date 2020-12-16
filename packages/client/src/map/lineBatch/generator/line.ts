import { clamp, sign, vec2copy, vec2create, vec2dot, vec2set, vec4copy, vec4create } from '@trufi/utils';
import { Bucket } from './bucket';

const invSqrt2 = 0.7071067811865475;
const currDirection = vec2create();
const nextDirection = vec2create();
const prevColor = vec4create();
const currColor = vec4create();
const prevPosition = vec2create();
const currPosition = vec2create();
const nextPosition = vec2create();
const normal = vec2create();

let prevNormalCorrection = 0;
let currNormalCorrection = 0;

export function line(bucket: Bucket, px: number[], py: number[], colors: number[][]) {
  const count = px.length;
  if (count < 2) {
    return;
  }
  prevNormalCorrection = 0;
  calcDirection(currDirection, px[0], py[0], px[1], py[1]);
  generateJoint(bucket, px[0], py[0], -currDirection[0], -currDirection[1], colors[0]);
  for (let i = 1; i < count; i++) {
    generateSegment(bucket, px, py, i, colors);
  }
  generateJoint(bucket, px[count - 1], py[count - 1], currDirection[0], currDirection[1], colors[count - 1]);
}

function generateSegment(bucket: Bucket, px: number[], py: number[], index: number, colors: number[][]) {
  const isLastVertex = index === px.length - 1;

  vec2set(prevPosition, px[index - 1], py[index - 1]);
  vec2set(currPosition, px[index], py[index]);

  vec4copy(prevColor, colors[index - 1]);
  vec4copy(currColor, colors[index]);
  unperp(normal, currDirection);

  if (!isLastVertex) {
    vec2set(nextPosition, px[index + 1], py[index + 1]);
    calcDirection(nextDirection, currPosition[0], currPosition[1], nextPosition[0], nextPosition[1]);
    const cosAlpha = clamp(vec2dot(currDirection, nextDirection), -1, 1);
    const isSharpTurn = cosAlpha <= 0;
    if (!isSharpTurn) {
      const tanHalfAlpha = Math.sqrt((1 - cosAlpha) / (1 + cosAlpha));
      const turnDirection = sign(vec2dot(normal, nextDirection));
      currNormalCorrection = tanHalfAlpha * turnDirection;
    } else {
      currNormalCorrection = 0;
      generateJoint(bucket, currPosition[0], currPosition[1], currDirection[0], currDirection[1], currColor);
    }
  } else {
    currNormalCorrection = 0;
  }

  generateIndices6(bucket, 0, 1, 3, 3, 1, 2);

  const scaledNormalX = normal[0] * invSqrt2;
  const scaledNormalY = normal[1] * invSqrt2;

  generateVertex(
    bucket,
    prevPosition[0],
    prevPosition[1],
    (normal[0] + currDirection[0] * prevNormalCorrection) * invSqrt2,
    (normal[1] + currDirection[1] * prevNormalCorrection) * invSqrt2,
    scaledNormalX,
    scaledNormalY,
    prevColor,
  );
  generateVertex(
    bucket,
    prevPosition[0],
    prevPosition[1],
    (-normal[0] - currDirection[0] * prevNormalCorrection) * invSqrt2,
    (-normal[1] - currDirection[1] * prevNormalCorrection) * invSqrt2,
    -scaledNormalX,
    -scaledNormalY,
    prevColor,
  );
  generateVertex(
    bucket,
    currPosition[0],
    currPosition[1],
    (-normal[0] + currDirection[0] * currNormalCorrection) * invSqrt2,
    (-normal[1] + currDirection[1] * currNormalCorrection) * invSqrt2,
    -scaledNormalX,
    -scaledNormalY,
    currColor,
  );
  generateVertex(
    bucket,
    currPosition[0],
    currPosition[1],
    (normal[0] - currDirection[0] * currNormalCorrection) * invSqrt2,
    (normal[1] - currDirection[1] * currNormalCorrection) * invSqrt2,
    scaledNormalX,
    scaledNormalY,
    currColor,
  );
  if (!isLastVertex) {
    vec2copy(currDirection, nextDirection);
    prevNormalCorrection = currNormalCorrection;
  }
}

function generateJoint(bucket: Bucket, x: number, y: number, xn: number, yn: number, color: number[]) {
  generateIndices3(bucket, 0, 1, 2);
  const nCorrX = -xn * 0.01;
  const nCorrY = -yn * 0.01;
  generateVertex(bucket, x, y, xn + nCorrX, yn + nCorrY, xn, yn, color);
  generateVertex(bucket, x, y, -yn + nCorrX, xn + nCorrY, -yn, xn, color);
  generateVertex(bucket, x, y, yn + nCorrX, -xn + nCorrY, yn, -xn, color);
}

function generateVertex(
  bucket: Bucket,
  x: number,
  y: number,
  xe: number,
  ye: number,
  xn: number,
  yn: number,
  color: number[],
) {
  const baseOffset8 = bucket.elements.offset * bucket.elements.stride;
  const baseOffset32 = baseOffset8 >> 2;
  bucket.position[baseOffset32] = x;
  bucket.position[baseOffset32 + 1] = y;
  bucket.extender[baseOffset8] = xe * 127;
  bucket.extender[baseOffset8 + 1] = ye * 127;
  bucket.normal[baseOffset8] = xn * 127;
  bucket.normal[baseOffset8 + 1] = yn * 127;
  if (bucket.color) {
    bucket.color[baseOffset8] = color[0];
    bucket.color[baseOffset8 + 1] = color[1];
    bucket.color[baseOffset8 + 2] = color[2];
    bucket.color[baseOffset8 + 3] = color[3];
  }
  bucket.elements.offset++;
}

function generateIndices6(
  bucket: Bucket,
  index1: number,
  index2: number,
  index3: number,
  index4: number,
  index5: number,
  index6: number,
) {
  const buffer = bucket.indices.buffer;
  const offset = bucket.indices.offset;
  const baseOffset = bucket.elements.offset;

  buffer[offset] = baseOffset + index1;
  buffer[offset + 1] = baseOffset + index2;
  buffer[offset + 2] = baseOffset + index3;

  buffer[offset + 3] = baseOffset + index4;
  buffer[offset + 4] = baseOffset + index5;
  buffer[offset + 5] = baseOffset + index6;

  bucket.indices.offset = offset + 6;
}

function generateIndices3(bucket: Bucket, index1: number, index2: number, index3: number) {
  const buffer = bucket.indices.buffer;
  const offset = bucket.indices.offset;
  const baseOffset = bucket.elements.offset;

  buffer[offset] = baseOffset + index1;
  buffer[offset + 1] = baseOffset + index2;
  buffer[offset + 2] = baseOffset + index3;

  bucket.indices.offset = offset + 3;
}

function calcDirection(result: number[], xPrev: number, yPrev: number, xOrig: number, yOrig: number) {
  if (xPrev !== xOrig || yPrev !== yOrig) {
    const xn1 = xOrig - xPrev;
    const yn1 = yOrig - yPrev;
    const rLen = 1 / Math.sqrt(xn1 * xn1 + yn1 * yn1);
    result[0] = xn1 * rLen;
    result[1] = yn1 * rLen;
  } else {
    result[0] = 0;
    result[1] = 0;
  }
}

function unperp(result: number[], vector: number[]) {
  result[0] = -vector[1];
  result[1] = vector[0];
}
