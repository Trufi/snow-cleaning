import { createRandomFunction } from '@game/utils';

/**
 * Запоминаем время старта сервера и считаем все от него,
 * чтобы время входило в int32
 *
 * ВНИМАНИЕ: Сервер не должен работать дольше 45 суток подряд,
 * иначе время выйдет за диапазон int32
 */
const startTime = Date.now();
export const time = () => Date.now() - startTime;

export const random = createRandomFunction(2314125);
