import * as ws from 'ws';
import type { AnyClientMsg } from '@game/client/src/messages';
// import { check } from './validation';

export const unpackMessage = (data: ws.Data, _id: string): AnyClientMsg | undefined => {
  if (typeof data !== 'string') {
    return;
  }

  let msg: AnyClientMsg;

  try {
    msg = JSON.parse(data);
  } catch (err) {
    console.error(`Client msg parse error`);
    return;
  }

  // if (check(msg, id)) {
  return msg;
  // }
};
