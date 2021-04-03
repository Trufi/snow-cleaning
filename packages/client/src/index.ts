import { AnyServerMsg } from '@game/server/messages';
import { Transport } from './transport';
import { msg } from './messages';

const transport = new Transport('localhost:3001', {
  onOpen: () => console.log('open'),
  onMessage: (serverMsg: AnyServerMsg) => {
    if (serverMsg.type !== 'tickData') {
      console.log('message', serverMsg);
    }

    if (serverMsg.type === 'connect') {
      transport.sendMessage(msg.joinGame('token todo'));
    }
  },
  onClose: () => console.log('close'),
});

console.log(transport);
