import * as vec2 from '@2gis/gl-matrix/vec2';
import * as vec3 from '@2gis/gl-matrix/vec3';
import { clamp, sign } from '@trufi/utils';
import { Bucket } from './bucket';

// 1 / Math.sqrt(2)
const invSqrt2 = 0.7071067811865475;

// Векторы текущего и следующего сегментов линии
const currDirection = vec2.create();
const nextDirection = vec2.create();

const prevShift = vec2.create();
const currShift = vec2.create();

const prevColor = vec3.create();
const currColor = vec3.create();

// Предыдущая, текущая и следующая вершины линии
const prevPosition = vec2.create();
const currPosition = vec2.create();
const nextPosition = vec2.create();

// Переперндикуляр к текущему сегменту
const normal = vec2.create();

// Коррекция нормали — число, на которое надо домножить вектор направления, чтобы
// получить miter-сочленение. Равняется тангенсу половинного угла между соседними
// сегментами. Нормаль с сочленением вычисляется по формуле:
// correctedNormal = normal + direction * normalCorrection
let prevNormalCorrection = 0;
let currNormalCorrection = 0;

/**
 * Генерит геометрию линии с утолщением, наконечниками и сочленениями.
 *
 * Используются сочленения двух видов:
 * 1. Для углов меньше 90° используется miter-сочленение. Для этого сочленения не
 *    требуется генерить дополнительных треугольников, что значительно снижает
 *    количество вершин в сцене и нагрузку на видеокарту.
 * 2. Для углов 90° и больше, а также для наконечников линии генерится треугольник,
 *    который в шейдере превращается в полукруг.
 */
export function generateSimpleLoftedLine(
  bucket: Bucket,
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  colors: ArrayLike<Vec3>,
  count: number,
  generateStartJoint: boolean,
  generateFinishJoint: boolean,
  id: number,
  sx?: ArrayLike<number>,
  sy?: ArrayLike<number>,
): void {
  if (count < 2) {
    return;
  }

  // Заполняем значение currDirection для первой итерации. Затем после каждой
  // итерации значение будет копироваться сюда из nextDirection.
  calcDirection(currDirection, px[0], py[0], px[1], py[1]);

  // Заполняем значение prevNormalCorrection для первой итерации. Затем после
  // каждой итерации значение будет копироваться сюда из currNormalCorrection.
  prevNormalCorrection = 0;

  // Генерим начальный полукружок, если это нужно
  if (generateStartJoint) {
    const shiftX = sx !== undefined ? sx[0] : 0;
    const shiftY = sy !== undefined ? sy[0] : 0;

    generateJoint(bucket, px[0], py[0], -currDirection[0], -currDirection[1], shiftX, shiftY, colors[0], id);
  }

  // Генерим сегменты и сочленения между ними
  for (let i = 1; i < count; i++) {
    generateSegment(bucket, px, py, i, count, colors, id, sx, sy);
  }

  // Генерим конечный полукружок, если это нужно
  if (generateFinishJoint) {
    const shiftX = sx !== undefined ? sx[count - 1] : 0;
    const shiftY = sy !== undefined ? sy[count - 1] : 0;

    generateJoint(
      bucket,
      px[count - 1],
      py[count - 1],
      currDirection[0],
      currDirection[1],
      shiftX,
      shiftY,
      colors[count - 1],
      id,
    );
  }
}

/**
 * Обозначения вершин и сегментов:
 *
 *           currDirection           угол α           nextDirection
 * *---------------------------------->*-------------------------------------->*
 * ↑                                   ↑                                       ↑
 * prevPosition (i - 1)                currPosition (i)     nextPosition (i + 1)
 */
function generateSegment(
  bucket: Bucket,
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  index: number,
  count: number,
  colors: ArrayLike<Vec3>,
  id: number,
  sx?: ArrayLike<number>,
  sy?: ArrayLike<number>,
): void {
  const isLastVertex = index === count - 1;

  vec2.set(prevPosition, px[index - 1], py[index - 1]);
  vec2.set(currPosition, px[index], py[index]);

  if (sx !== undefined && sy !== undefined) {
    vec2.set(prevShift, sx[index - 1], sy[index - 1]);
    vec2.set(currShift, sx[index], sy[index]);
  } else {
    vec2.set(prevShift, 0, 0);
    vec2.set(currShift, 0, 0);
  }

  vec3.copy(prevColor, colors[index - 1]);
  vec3.copy(currColor, colors[index]);

  // Вычисляем нормаль, повернув направление против часовой стрелки на 90°
  unperp(normal, currDirection);

  // Если вершина не последняя, вычисляем направление следующего сегмента,
  // а также коррекцию нормали для сочленения
  if (!isLastVertex) {
    vec2.set(nextPosition, px[index + 1], py[index + 1]);

    // Вычисляем вектор nextDirection
    calcDirection(nextDirection, currPosition[0], currPosition[1], nextPosition[0], nextPosition[1]);

    // Вычисляем косинус угла между векторами currDirection и nextDirection.
    // Так как векторы нормированные, он равен их скалярному произведению.
    // Значение произведения явно ограничивается отрезком [-1; 1], так как при
    // значении угла ровно 0° из-за недостатка точности здесь могут получаться
    // значения типа 1.0000000002, что приводит к ошибке вычисления квадратного
    // корня ниже по коду.
    const cosAlpha = clamp(vec2.dot(currDirection, nextDirection), -1, 1);

    // Считаем поворот крутым, если его угол 90° или больше (т. е. косинус <= 0)
    const isSharpTurn = cosAlpha <= 0;

    // Для некрутого поворота генерим miter-сочленение, просто сдвигая нормаль
    // в сторону. Для крутого поворота коррекцию нормали не вычисляем, а просто
    // генерим полукружочек.
    if (!isSharpTurn) {
      // Вычисляем тангенс α / 2 по формуле половинного угла
      const tanHalfAlpha = Math.sqrt((1 - cosAlpha) / (1 + cosAlpha));

      // Вычисляем направление поворота (влево или вправо) по знаку скалярного
      // произведения между нормалью текущего сегмента и направление следующего
      const turnDirection = sign(vec2.dot(normal, nextDirection));

      currNormalCorrection = tanHalfAlpha * turnDirection;
    } else {
      currNormalCorrection = 0;
      generateJoint(
        bucket,
        currPosition[0],
        currPosition[1],
        currDirection[0],
        currDirection[1],
        currShift[0],
        currShift[1],
        currColor,
        id,
      );
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
    prevShift[0],
    prevShift[1],
    prevColor,
    id,
  );
  generateVertex(
    bucket,
    prevPosition[0],
    prevPosition[1],
    (-normal[0] - currDirection[0] * prevNormalCorrection) * invSqrt2,
    (-normal[1] - currDirection[1] * prevNormalCorrection) * invSqrt2,
    -scaledNormalX,
    -scaledNormalY,
    prevShift[0],
    prevShift[1],
    prevColor,
    id,
  );
  generateVertex(
    bucket,
    currPosition[0],
    currPosition[1],
    (-normal[0] + currDirection[0] * currNormalCorrection) * invSqrt2,
    (-normal[1] + currDirection[1] * currNormalCorrection) * invSqrt2,
    -scaledNormalX,
    -scaledNormalY,
    currShift[0],
    currShift[1],
    currColor,
    id,
  );
  generateVertex(
    bucket,
    currPosition[0],
    currPosition[1],
    (normal[0] - currDirection[0] * currNormalCorrection) * invSqrt2,
    (normal[1] - currDirection[1] * currNormalCorrection) * invSqrt2,
    scaledNormalX,
    scaledNormalY,
    currShift[0],
    currShift[1],
    currColor,
    id,
  );

  // Для следующей итерации копируем текущие значения в предыдущие, следующие в текущие
  if (!isLastVertex) {
    vec2.copy(currDirection, nextDirection);
    prevNormalCorrection = currNormalCorrection;
  }
}

function generateJoint(
  bucket: Bucket,
  x: number,
  y: number,
  xn: number,
  yn: number,
  xs: number,
  ys: number,
  color: Vec3,
  id: number,
): void {
  generateIndices3(bucket, 0, 1, 2);

  // Немного прижимаем окончание к сегменту, чтобы избежать зазора между ними
  const nCorrX = -xn * 0.01;
  const nCorrY = -yn * 0.01;

  generateVertex(bucket, x, y, xn + nCorrX, yn + nCorrY, xn, yn, xs, ys, color, id);
  generateVertex(bucket, x, y, -yn + nCorrX, xn + nCorrY, -yn, xn, xs, ys, color, id);
  generateVertex(bucket, x, y, yn + nCorrX, -xn + nCorrY, yn, -xn, xs, ys, color, id);
}

function generateVertex(
  bucket: Bucket,
  x: number,
  y: number,
  xe: number,
  ye: number,
  xn: number,
  yn: number,
  xs: number,
  ys: number,
  color: Vec3,
  id: number,
): void {
  const baseOffset8 = bucket.elements.offset * bucket.elements.stride;
  const baseOffset32 = baseOffset8 >> 2;

  bucket.position[baseOffset32] = x;
  bucket.position[baseOffset32 + 1] = y;

  bucket.extender[baseOffset8] = xe * 127;
  bucket.extender[baseOffset8 + 1] = ye * 127;

  bucket.normal[baseOffset8] = xn * 127;
  bucket.normal[baseOffset8 + 1] = yn * 127;

  if (bucket.shift !== undefined) {
    bucket.shift[baseOffset32] = xs;
    bucket.shift[baseOffset32 + 1] = ys;
  }

  if (bucket.color) {
    bucket.color[baseOffset8] = color[0];
    bucket.color[baseOffset8 + 1] = color[1];
    bucket.color[baseOffset8 + 2] = color[2];
  }

  if (bucket.localID !== undefined) {
    bucket.localID[baseOffset32] = id;
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
): void {
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

function generateIndices3(bucket: Bucket, index1: number, index2: number, index3: number): void {
  const buffer = bucket.indices.buffer;
  const offset = bucket.indices.offset;
  const baseOffset = bucket.elements.offset;

  buffer[offset] = baseOffset + index1;
  buffer[offset + 1] = baseOffset + index2;
  buffer[offset + 2] = baseOffset + index3;

  bucket.indices.offset = offset + 3;
}

function calcDirection(result: Vec2, xPrev: number, yPrev: number, xOrig: number, yOrig: number): void {
  if (xPrev !== xOrig || yPrev !== yOrig) {
    //  (posOrig - posPrev)
    const xn1 = xOrig - xPrev;
    const yn1 = yOrig - yPrev;

    //  reciprocal of length
    const rLen = 1 / Math.sqrt(xn1 * xn1 + yn1 * yn1);

    result[0] = xn1 * rLen;
    result[1] = yn1 * rLen;
  } else {
    result[0] = 0;
    result[1] = 0;
  }
}

/**
 * Вычисляет перпендикуляр, полученный вращением данного вектора на 90° против
 * часовой стрелки
 */
function unperp(result: Vec2, vector: Vec2): void {
  result[0] = -vector[1];
  result[1] = vector[0];
}
