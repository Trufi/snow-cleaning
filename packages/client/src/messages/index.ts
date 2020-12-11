import { ObjectElement } from '@game/utils';

const joinGame = (token: string) => ({
  type: 'joinGame' as 'joinGame',
  token,
});

const ping = (time: number) => ({
  type: 'ping' as 'ping',
  time,
});

export const msg = {
  joinGame,
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
