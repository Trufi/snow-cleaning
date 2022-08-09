import * as ws from 'ws';
import type { AnyClientMsg } from '@game/client/messages';
// import { check } from './validation';

export const unpackMessage = (data: ws.Data, isBinary: boolean, _id: string): AnyClientMsg | undefined => {
  const message = isBinary ? data : data.toString();
  if (typeof message !== 'string') {
    return;
  }

  let msg: AnyClientMsg;

  try {
    msg = JSON.parse(message);
  } catch (err) {
    console.error(`Client msg parse error`);
    return;
  }

  // if (check(msg, id)) {
  return msg;
  // }
};
