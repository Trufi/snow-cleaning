import { AnyServerMsg, ServerMsg } from '@game/server/messages';
import { Transport, TransportProps } from './transport';
import { msg } from './messages';

export class InitialState {
  public type = 'initial' as const;
  private messageHandlers: TransportProps;
  private transport: Transport;

  constructor() {
    this.messageHandlers = {
      onOpen: () => console.log('open'),
      onMessage: this.onServerMessage,
      onClose: () => console.log('close'),
    };

    this.transport = new Transport('localhost:3001', this.messageHandlers);
  }

  private onServerMessage = (serverMsg: AnyServerMsg) => {
    console.log('message', serverMsg);

    switch (serverMsg.type) {
      case 'connect': {
        this.transport.sendMessage(msg.joinGame('token todo'));
        break;
      }

      case 'startData': {
        new InGameState(this.messageHandlers, this.transport, serverMsg);
        break;
      }
    }
  };
}

class InGameState {
  public type = 'initial' as const;

  constructor(
    private messageHandlers: TransportProps,
    private transport: Transport,
    serverMsg: ServerMsg['startData'],
  ) {
    messageHandlers.onMessage = this.onServerMessage;
  }

  private onServerMessage = (serverMsg: AnyServerMsg) => {
    if (serverMsg.type !== 'tickData') {
      console.log('message', serverMsg);
    }
  };
}
