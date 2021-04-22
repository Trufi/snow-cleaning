export type Sample = Array<[number, number[]]>;

export function sampleColor(sample: Sample, value: number) {
  const segNumber = getCurveSegment(sample, value);

  if (segNumber === 0) {
    return sample[0][1];
  }

  if (segNumber === sample.length) {
    return sample[sample.length - 1][1];
  }

  const ratio = getRatio(sample, value, segNumber);

  const prevColor = sample[segNumber - 1][1];
  const nextColor = sample[segNumber][1];

  return [
    prevColor[0] * (1 - ratio) + nextColor[0] * ratio,
    prevColor[1] * (1 - ratio) + nextColor[1] * ratio,
    prevColor[2] * (1 - ratio) + nextColor[2] * ratio,
    prevColor[3] * (1 - ratio) + nextColor[3] * ratio,
  ];
}

/**
 * Возвращает индекс сегмента кривой, которому принадлежит value
 * Индекс сегмента = индексу его правой точки
 */
function getCurveSegment(sample: Sample, value: number): number {
  let i = 0;

  while (i < sample.length) {
    if (value < sample[i][0]) {
      break;
    } else {
      i++;
    }
  }

  return i;
}

/**
 * Возвращает соотношение для интерполяции между левой и правой точками сегмента
 */
function getRatio(sample: Sample, value: number, segNumber: number): number {
  const difference = sample[segNumber][0] - sample[segNumber - 1][0];
  const progress = value - sample[segNumber - 1][0];
  return progress / difference;
}
