import { createRandomFunction } from '@trufi/utils';
import { config } from './config';

/**
 * Запоминаем время старта сервера и считаем все от него,
 * чтобы время входило в int32
 *
 * ВНИМАНИЕ: Сервер не должен работать дольше 45 суток подряд,
 * иначе время выйдет за диапазон int32
 */
const startTime = Date.now();
export const time = () => (Date.now() - startTime) % 2147483647;

export const random = createRandomFunction(2314125);

let nextColorIndex = Math.floor(Math.random() * config.colors.length);
export function getNextColorIndex() {
  nextColorIndex = (nextColorIndex + 1) % config.colors.length;
  return nextColorIndex;
}
