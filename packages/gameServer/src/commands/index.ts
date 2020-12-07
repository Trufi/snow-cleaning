import { ObjectElement } from '@snow/utils';
import { AnyServerMsg } from '../messages';

const sendMsg = (connectionId: number, msg: AnyServerMsg) => ({
  type: 'sendMsg' as 'sendMsg',
  connectionId,
  msg,
});

const sendMsgTo = (connectionIds: number[], msg: AnyServerMsg) => ({
  type: 'sendMsgTo' as 'sendMsgTo',
  connectionIds,
  msg,
});

const sendPbfMsgTo = (connectionIds: number[], msg: ArrayBuffer) => ({
  type: 'sendPbfMsgTo' as 'sendPbfMsgTo',
  connectionIds,
  msg,
});

const sendMsgToAllInGame = (msg: AnyServerMsg) => ({
  type: 'sendMsgToAllInGame' as 'sendMsgToAllInGame',
  msg,
});

const notifyMain = () => ({
  type: 'notifyMain' as 'notifyMain',
});

const authPlayer = (connectionId: number, token: string, joinType: 'player') => ({
  type: 'authPlayer' as 'authPlayer',
  connectionId,
  token,
  joinType,
});

export const cmd = {
  sendMsg,
  sendMsgTo,
  sendPbfMsgTo,
  sendMsgToAllInGame,
  authPlayer,
  notifyMain,
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
