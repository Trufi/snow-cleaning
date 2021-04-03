import { AnyServerMsg, ServerMsg } from '@game/server/messages';
import { Transport, TransportProps } from './transport';
import { msg } from './messages';
import { Game } from './game/game';
import { Render } from './map/render';

export class InitialState {
  public type = 'initial' as const;
  private messageHandlers: TransportProps;
  private transport: Transport;

  constructor(private render: Render) {
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
        new InGameState(this.messageHandlers, this.transport, this.render, serverMsg);
        break;
      }
    }
  };
}

class InGameState {
  public type = 'initial' as const;
  private game: Game;

  constructor(
    messageHandlers: TransportProps,
    _transport: Transport,
    render: Render,
    startData: ServerMsg['startData'],
  ) {
    messageHandlers.onMessage = this.onServerMessage;
    this.game = new Game(render, startData);
  }

  private onServerMessage = (serverMsg: AnyServerMsg) => {
    if (serverMsg.type !== 'tickData') {
      console.log('message', serverMsg);
    }

    switch (serverMsg.type) {
      case 'tickData': {
        this.game.updateFromServer(serverMsg);
        break;
      }
    }
  };
}
