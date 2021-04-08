import { AnyServerMsg, ServerMsg } from '@game/server/messages';
import { Transport, TransportProps } from './transport';
import { msg } from './messages';
import { Game } from './game/game';
import { Render } from './map/render';
import { projectGeoToMap } from './utils';
import { Cmd, ExistCmd } from './commands';

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
    private transport: Transport,
    private render: Render,
    startData: ServerMsg['startData'],
  ) {
    messageHandlers.onMessage = this.onServerMessage;
    this.game = new Game(render, startData);

    document.getElementById('map')?.addEventListener('click', (ev) => {
      const lngLat = this.render.map.unproject([ev.clientX, ev.clientY]);
      const point = projectGeoToMap(lngLat);
      this.executeCmd(this.game.goToPoint(point));
    });
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

      case 'pollution': {
        this.game.updatePollutionFromServer(serverMsg);
        break;
      }

      case 'playerEnter': {
        this.game.addPlayer(serverMsg);
        break;
      }

      case 'playerLeave': {
        this.game.removePlayer(serverMsg);
        break;
      }
    }
  };

  private executeCmd(cmd: Cmd) {
    if (cmd) {
      if (Array.isArray(cmd)) {
        cmd.forEach((c) => this.executeOneCmd(c));
      } else {
        this.executeOneCmd(cmd);
      }
    }
  }

  private executeOneCmd(cmdData: ExistCmd) {
    switch (cmdData.type) {
      case 'sendMsg': {
        this.transport.sendMessage(cmdData.msg);
        break;
      }
    }
  }
}
