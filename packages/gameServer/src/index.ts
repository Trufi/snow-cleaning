import '@2gis/gl-matrix';
import * as express from 'express';
import { tick, connectionLost } from './reducers';
import { createState } from './state';
import { time } from './utils';
import { config } from './config';
import { applyRoutes } from './routes';
import { initSocket } from './socket';

const app = express();

app.use(express.json());

const server = app.listen(config.port, () => console.log(`Game server listen on ${config.port} port`));

let url = config.url;
// Если случайно передали протокол, то убираем его
url = url.replace('http://', '');
url = url.replace('https://', '');

// TODO: сделать бесконечной, когда уйдет ограничение на time
const duration = 2 ** 32;

const state = createState(
  {
    maxPlayers: 100,
    duration,
    url,
  },
  time(),
);

console.log(`Start game server with url: ${state.url}, maxPlayers: ${state.game.maxPlayers}, duration: ${duration}`);

const { executeCmd } = initSocket(server, state);
applyRoutes(app, state, executeCmd);

// Запускаем основной game loop
const gameLoop = () => {
  setTimeout(gameLoop, config.serverGameStep);
  const cmd = tick(state, time());
  executeCmd(cmd);
};
gameLoop();

// Запускаем переодический healthcheck соединений
const noop = () => {};
setInterval(() => {
  state.connections.map.forEach((connection) => {
    if (!connection.isAlive) {
      connection.socket.terminate();
      executeCmd(connectionLost(state, connection.id));
      console.log(`Terminate dead connection, id: ${connection.id}`);
    } else {
      connection.isAlive = false;
      connection.socket.ping(noop);
    }
  });
}, config.clientsCheckInterval);
