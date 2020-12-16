import { Server } from 'http';
import type { AnyClientMsg, ClientMsg } from '@game/client/messages';
import { Cmd, ExistCmd } from './commands';
import { config } from './config';
import { Game } from './games/game';
import { msg } from './messages';
import { Transport } from './transport';
import { Connection, InitialConnection, PlayerConnection } from './types';
import { time } from './utils';

export class Core {
  public game: Game;
  public connections: Map<string, Connection>;

  private transport: Transport;

  constructor(httpServer: Server, public url: string) {
    this.transport = new Transport(httpServer, {
      onNewConnection: this.onNewConnection,
      onMessage: this.onMessage,
      onConnectionLost: this.onConnectionLost,
    });

    this.connections = new Map();

    this.game = new Game({
      currentTime: time(),

      // TODO: сделать бесконечной, когда уйдет ограничение на time
      duration: 2 ** 32,

      maxPlayers: 200,
    });

    // Запускаем основной game loop
    const gameLoop = () => {
      setTimeout(gameLoop, config.serverGameStep);
      const cmd = this.game.update(time());
      this.executeCmd(cmd);
    };
    gameLoop();
  }

  private onNewConnection = (id: string) => {
    const connection: InitialConnection = {
      status: 'initial',
      id,
    };
    this.connections.set(id, connection);
  };

  /**
   * Обработка сообщений клиента
   */
  private onMessage = (id: string, msg: any) => {
    const connection = this.connections.get(id);
    if (!connection) {
      console.log(`Not found connection ${id} in core`);
      return;
    }

    switch (connection.status) {
      case 'initial':
        this.initialConnectionMessage(connection, msg);
        break;
      case 'player':
        this.playerConnectionMessage(connection, msg);
        break;
    }
  };

  private onConnectionLost = (id: string) => {
    const connection = this.connections.get(id);
    if (!connection) {
      console.log(`Not found connection ${id} in core`);
      return;
    }

    console.log(
      `Connection lost id: ${connection.id}, userId: ${connection.status !== 'initial' && connection.userId} status: ${
        connection.status
      }`,
    );
    this.connections.delete(id);

    switch (connection.status) {
      case 'player': {
        this.executeCmd(this.game.removePlayer(connection.id));
      }
    }
  };

  public authConnection(
    connectionId: string,
    data: {
      userId: number;
      name: string;
    },
    joinType: 'player',
  ) {
    const { userId, name } = data;

    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'initial') {
      return;
    }

    if (joinType === 'player') {
      const can = this.game.canPlayerBeAdded(userId);
      if (!can) {
        console.log(`User userId: ${userId} game join fail`);
        this.transport.sendMessage(connection.id, msg.gameJoinFail());
        return;
      }

      console.log(`User (name: ${name}, userId: ${userId}, connectionId: ${connectionId}) join as ${joinType}`);

      this.connections.set(connection.id, {
        status: 'player',
        id: connection.id,
        userId,
        name,
      });

      this.executeCmd(this.game.addPlayer(connection.id, data));
    }
  }

  public kickAll() {
    this.connections.forEach(({ id }) => {
      this.transport.terminate(id);
    });
  }

  public initialConnectionMessage(connection: InitialConnection, clientMsg: any) {
    switch (clientMsg.type) {
      case 'joinGame':
        return this.authConnection(
          connection.id,
          {
            // TODO
            userId: 0,
            name: '',
          },
          'player',
        );
      case 'ping':
        return this.pingMessage(clientMsg, connection);
    }
  }

  private playerConnectionMessage(connection: PlayerConnection, clientMsg: AnyClientMsg) {
    switch (clientMsg.type) {
      // case 'changes':
      //   this.updatePlayerChanges(clientMsg, connection.id);
      //   break;

      case 'ping':
        this.pingMessage(clientMsg, connection);
        break;
    }
  }

  // private updatePlayerChanges(msg: ClientMsg['changes'], connectionId: string) {
  //   const connection = this.connections.get(connectionId);
  //   if (!connection || connection.status !== 'player') {
  //     return;
  //   }

  //   this.executeCmd(this.game.updatePlayerChanges(connectionId, msg));
  // }

  private pingMessage(clientMsg: ClientMsg['ping'], connection: Connection) {
    // Да, функция — не чистая, но и пофиг!
    this.transport.sendMessage(connection.id, msg.pong(time(), clientMsg.time));
  }

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
        this.transport.sendMessage(cmdData.connectionId, cmdData.msg);
        break;
      }

      case 'sendMsgTo': {
        cmdData.connectionIds.forEach((id) => {
          this.transport.sendMessage(id, cmdData.msg);
        });
        break;
      }

      case 'sendPbfMsgTo': {
        cmdData.connectionIds.forEach((id) => {
          this.transport.sendPbfMessage(id, cmdData.msg);
        });
        break;
      }

      case 'sendMsgToAllInGame': {
        this.connections.forEach((connection) => {
          if (connection.status === 'player') {
            this.transport.sendMessage(connection.id, cmdData.msg);
          }
        });
        break;
      }
    }
  }
}
