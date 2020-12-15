import type { AnyServerMsg } from '@game/gameserver/src/messages';

const unpackPbf = (_buffer: ArrayBuffer): AnyServerMsg | undefined => {
  return;
};

export const unpackMessage = (data: string | ArrayBuffer): AnyServerMsg | undefined => {
  if (data instanceof ArrayBuffer) {
    return unpackPbf(data);
  }

  if (typeof data !== 'string') {
    return;
  }

  let msg: AnyServerMsg;

  try {
    msg = JSON.parse(data);
  } catch (e) {
    console.error(`Bad server message ${data}`);
    return;
  }

  return msg;
};
