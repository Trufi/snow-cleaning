import { ObjectElement } from '@game/utils';
import { Route } from '@trufi/roads';

const joinGame = (name: string) => ({
  type: 'joinGame' as const,
  name,
});

const newRoute = (serverTime: number, route: Route) => ({
  type: 'newRoute' as const,
  edges: route.edges.map(({ edge: { index }, forward }) => ({ index, forward })),
  fromAt: route.fromAt,
  toAt: route.toAt,
  time: serverTime,
});

const ping = (time: number) => ({
  type: 'ping' as const,
  time,
});

export const msg = {
  joinGame,
  newRoute,
  ping,
};

/**
 * Union тип всех сообщений клиента
 */
export type AnyClientMsg = ReturnType<ObjectElement<typeof msg>>;

type MsgMap = typeof msg;
/**
 * Мапа всех сообщений клиента, с помощью которой можно получить конкретное:
 * type BodyStateMsg = ClientMsg['bodyState'];
 */
export type ClientMsg = { [K in keyof MsgMap]: ReturnType<MsgMap[K]> };
