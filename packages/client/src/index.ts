import { Transport } from './transport';

const transport = new Transport('localhost:3001', {
  onOpen: () => console.log('open'),
  onMessage: (msg) => console.log('message', msg),
  onClose: () => console.log('close'),
});

console.log(transport);
