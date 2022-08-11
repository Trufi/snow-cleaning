import { Server } from 'http';
import ws from 'ws';
import hyperid from 'hyperid';
import { unpackMessage } from './messages/unpack';
import { config } from './config';

const getId = hyperid();

const noop = () => {};

interface Connection {
  id: string;
  socket: ws;
  isAlive: boolean;
}

export interface TransportProps {
  onNewConnection: (id: string) => void;
  onMessage: (id: string, msg: any) => void;
  onConnectionLost: (id: string) => void;
}

export class Transport {
  private wsServer: ws.Server;

  private connections: Map<string, Connection>;

  constructor(httpServer: Server, private props: TransportProps) {
    this.connections = new Map();
    this.wsServer = new ws.Server({ server: httpServer });

    this.wsServer.on('connection', this.onConnection);

    // Запускаем переодический healthcheck соединений
    setInterval(this.checkup, config.clientsCheckInterval);
  }

  public sendMessage(id: string, msg: object | ArrayBuffer): void {
    const connection = this.connections.get(id);
    if (!connection) {
      console.log(`Trasport connection: ${id} not found`);
      return;
    }

    if (connection.socket.readyState === ws.OPEN) {
      connection.socket.send(JSON.stringify(msg), (err) => {
        if (err) {
          console.log(`Socket (connectionId: ${connection.id}) send error: ${err.message}`);
        }
      });
    }
  }

  public sendPbfMessage(id: string, msg: ArrayBuffer): void {
    const connection = this.connections.get(id);
    if (!connection) {
      console.log(`Trasport connection: ${id} not found`);
      return;
    }

    if (connection.socket.readyState === ws.OPEN) {
      connection.socket.send(msg, (err) => {
        if (err) {
          console.log(`Socket (connectionId: ${connection.id}) send error: ${err.message}`);
        }
      });
    }
  }

  public terminate(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      console.log(`Trasport connection: ${id} not found`);
      return;
    }
    connection.socket.terminate();
  }

  private checkup = () => {
    this.connections.forEach((connection) => {
      if (!connection.isAlive) {
        connection.socket.terminate();
        this.props.onConnectionLost(connection.id);
        console.log(`Terminate dead connection, id: ${connection.id}`);
      } else {
        connection.isAlive = false;
        connection.socket.ping(noop);
      }
    });
  };

  private onConnection = (socket: ws) => {
    const id = getId();

    const connection: Connection = {
      id,
      socket,
      isAlive: true,
    };

    socket.on('message', this.onMessage(connection));
    socket.on('close', this.onClose(connection));
    socket.on('pong', this.onPong(connection));

    this.connections.set(id, connection);

    this.props.onNewConnection(id);
  };

  private onMessage = (connection: Connection) => (data: ws.Data, isBinary: boolean) => {
    const msg = unpackMessage(data, isBinary, connection.id);
    if (!msg) {
      return;
    }

    this.props.onMessage(connection.id, msg);
  };

  private onPong = (connection: Connection) => () => {
    connection.isAlive = true;
  };

  private onClose = (connection: Connection) => () => {
    this.props.onConnectionLost(connection.id);

    connection.socket.removeAllListeners('message');
    connection.socket.removeAllListeners('close');
    connection.socket.removeAllListeners('pong');

    this.connections.delete(connection.id);
  };
}
