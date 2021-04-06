import { ObjectElement } from '@game/utils';
import { AnyClientMsg } from '../messages';

const sendMsg = (msg: AnyClientMsg) => ({
  type: 'sendMsg' as const,
  msg,
});

export const cmd = {
  sendMsg,
};

export const union = (cmds: Cmd[]): Cmd => {
  let res: Cmd = [];

  for (const c of cmds) {
    if (c) {
      res = res.concat(c);
    }
  }

  return res;
};

export type ExistCmd = ReturnType<ObjectElement<typeof cmd>>;

export type Cmd = ExistCmd | ExistCmd[] | undefined | void;
