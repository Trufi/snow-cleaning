import { config } from '@game/server/config';
import { AnyServerMsg, ServerMsg } from '@game/server/messages';
import { DataGraph } from '@trufi/roads';
import { Cmd, ExistCmd } from './commands';
import { Game } from './game/game';
import { Render } from './map/render';
import { msg } from './messages';
import { Transport, TransportProps } from './transport';
import { renderUI, RenderUIFunction } from './ui/renderUI';

export class InitialState {
  public type = 'initial' as const;
  private messageHandlers: TransportProps;
  private transport: Transport;
  private renderUI = renderUI;

  constructor(private dataGraph: DataGraph, private render: Render) {
    this.messageHandlers = {
      onOpen: () => console.log('open'),
      onMessage: this.onServerMessage,
      onClose: () => console.log('close'),
    };

    this.transport = new Transport(config.publicWebSocketURL, this.messageHandlers);

    this.renderUI({ type: 'initial' });
  }

  private onServerMessage = (serverMsg: AnyServerMsg) => {
    console.log('message', serverMsg);

    switch (serverMsg.type) {
      case 'connect': {
        const nameFromStorage = localStorage.getItem('playerName');
        if (nameFromStorage) {
          this.onNameSubmit(nameFromStorage);
        } else {
          this.renderUI({ type: 'connected', onNameSubmit: this.onNameSubmit });
        }
        break;
      }

      case 'startData': {
        new InGameState(this.messageHandlers, this.transport, this.dataGraph, this.render, this.renderUI, serverMsg);
        break;
      }
    }
  };

  private onNameSubmit = (name: string) => {
    localStorage.setItem('playerName', name);
    this.transport.sendMessage(msg.joinGame(name));
  };
}

class InGameState {
  public type = 'initial' as const;
  private game: Game;

  constructor(
    messageHandlers: TransportProps,
    private transport: Transport,
    dataGraph: DataGraph,
    render: Render,
    renderUI: RenderUIFunction,
    startData: ServerMsg['startData'],
  ) {
    messageHandlers.onMessage = this.onServerMessage;
    this.game = new Game(dataGraph, render, renderUI, startData);

    requestAnimationFrame(this.loop);
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    this.executeCmd(this.game.update());
  };

  private onServerMessage = (serverMsg: AnyServerMsg) => {
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

      case 'pong': {
        this.game.updatePingAndServerTime(serverMsg);
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
