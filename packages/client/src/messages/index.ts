import { ClientGraphVertex } from '@game/data/clientGraph';
import { ObjectElement } from '@game/utils';

const joinGame = (token: string) => ({
  type: 'joinGame' as const,
  token,
});

const newRoute = (fromAt: number, vertices: ClientGraphVertex[], toAt: number) => ({
  type: 'newRoute' as const,
  vertexIndices: vertices.map((vertex) => vertex.index),
  fromAt,
  toAt,
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
