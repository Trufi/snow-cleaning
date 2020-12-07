import * as ws from 'ws';
import { AnyClientMsg, ClientMsg } from '../../client/messages';
import { ConnectionsState, InitialConnection, PlayerConnection, State, Connection, RestartData } from '../types';
import { Cmd, cmd } from '../commands';
import { msg } from '../messages';
import { time } from '../utils';
import * as game from '../games/game';

export const createNewConnection = (state: ConnectionsState, socket: ws): number => {
  const connection: InitialConnection = {
    status: 'initial',
    id: state.nextId,
    socket,
    isAlive: true,
  };
  state.nextId++;
  state.map.set(connection.id, connection);
  return connection.id;
};

export const authConnection = (
  state: State,
  connectionId: number,
  data: {
    userId: number;
    name: string;
    deaths: number;
    kills: number;
    points: number;
  },
  joinType: 'player',
): Cmd => {
  const { userId, name } = data;

  const connection = state.connections.map.get(connectionId);
  if (!connection || connection.status !== 'initial') {
    return;
  }

  if (joinType === 'player') {
    const can = game.canJoinPlayer(state.game, userId);
    if (!can) {
      console.log(`User userId: ${userId} game join fail`);
      return cmd.sendMsg(connection.id, msg.gameJoinFail());
    }

    console.log(`User (name: ${name}, userId: ${userId}, connectionId: ${connectionId}) join as ${joinType}`);

    state.connections.map.set(connection.id, {
      status: 'player',
      id: connection.id,
      socket: connection.socket,
      userId,
      name,
      isAlive: connection.isAlive,
    });

    return game.joinPlayer(state.game, connection.id, data);
  }
};

/**
 * Обработка сообщений клиента
 */
export const message = (state: State, connectionId: number, msg: AnyClientMsg): Cmd => {
  const connection = state.connections.map.get(connectionId);
  if (!connection) {
    return;
  }

  switch (connection.status) {
    case 'initial':
      return initialConnectionMessage(state, connection, msg);
    case 'player':
      return playerConnectionMessage(state, connection, msg);
  }
};

export const initialConnectionMessage = (state: State, connection: InitialConnection, clientMsg: AnyClientMsg): Cmd => {
  switch (clientMsg.type) {
    case 'joinGame':
      return joinGame(state, connection, clientMsg);
    case 'joinGameAsBot':
      return authConnection(
        state,
        connection.id,
        {
          userId: clientMsg.userId,
          name: clientMsg.name,
          kills: 0,
          deaths: 0,
          points: 0,
        },
        'player',
      );
    case 'joinGameAsObserver':
      return joinGameAsObserver(state, connection, clientMsg);
    case 'ping':
      return pingMessage(clientMsg, connection);
  }
};

const joinGame = (_state: State, connection: InitialConnection, clientMsg: ClientMsg['joinGame']): Cmd => {
  const { token } = clientMsg;
  return cmd.authPlayer(connection.id, token, 'player');
};

const joinGameAsObserver = (
  _state: State,
  connection: InitialConnection,
  clientMsg: ClientMsg['joinGameAsObserver'],
): Cmd => {
  const { token } = clientMsg;
  return cmd.authPlayer(connection.id, token, 'observer');
};

export const playerConnectionMessage = (state: State, connection: PlayerConnection, clientMsg: AnyClientMsg): Cmd => {
  switch (clientMsg.type) {
    case 'changes':
      return updatePlayerChanges(state, clientMsg, connection.id);
    case 'ping':
      return pingMessage(clientMsg, connection);
  }
};

export const pingMessage = (clientMsg: ClientMsg['ping'], connection: Connection): Cmd => {
  // Да, функция — не чистая, но и пофиг!
  return cmd.sendMsg(connection.id, msg.pong(time(), clientMsg.time));
};

export const connectionLost = (state: State, connectionId: number): Cmd => {
  const connection = state.connections.map.get(connectionId);
  if (!connection) {
    return;
  }
  console.log(
    `Connection lost id: ${connection.id}, userId: ${connection.status !== 'initial' && connection.userId} status: ${
      connection.status
    }`,
  );
  state.connections.map.delete(connectionId);

  switch (connection.status) {
    case 'player': {
      return game.kickPlayer(state.game, connection.id);
    }
  }
};

export const kickAll = (state: State) => {
  state.connections.map.forEach(({ socket }) => {
    socket.terminate();
  });
};

const updatePlayerChanges = (state: State, msg: ClientMsg['changes'], connectionId: number): Cmd => {
  const connection = state.connections.map.get(connectionId);
  if (!connection || connection.status !== 'player') {
    return;
  }

  return game.updatePlayerChanges(state.game, connectionId, msg);
};

export const tick = (state: State, time: number): Cmd => {
  return game.tick(state.game, time);
};

export const restartInSeconds = (state: State, data: RestartData) => {
  return game.restartInSeconds(state.game, data);
};
