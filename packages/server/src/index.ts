import * as express from 'express';
import * as path from 'path';
import * as cors from 'cors';
import { config } from './config';
import { applyApiRoutes } from './api';
import { Core } from './core';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, '../../newdata/assets')));

const server = app.listen(config.port, () => console.log(`Game server listen on ${config.port} port`));

let url = config.url;
// Если случайно передали протокол, то убираем его
url = url.replace('http://', '');
url = url.replace('https://', '');

const core = new Core(server, url);

applyApiRoutes(app, core);
