import * as express from 'express';
import * as Joi from 'joi';
import { mapMap } from '@game/utils';
import { RestartRequest, KickAllRequest } from './types/api';
import { Core } from './core';

const secret = 'secretcode';

const kickallScheme = Joi.object().keys({
  secret: Joi.string().allow(secret).required(),
});

const restartScheme = Joi.object().keys({
  name: Joi.string().min(1).required(),
  duration: Joi.number().min(0).required(),
  inSeconds: Joi.number().min(0).required(),
  secret: Joi.string().allow(secret).required(),
});

export const applyRoutes = (app: express.Express, core: Core) => {
  // healthcheck
  app.get('/', (_req, res) => res.sendStatus(200));

  app.get('/state', (_req, res) => {
    const result = {
      url: core.url,
      connections: mapMap(core.connections, ({ id, status }) => ({ id, status })),
      game: core.game.getDebugInfo(),
    };
    res.send(JSON.stringify(result));
  });

  app.get('/kickall', (req, res) => {
    const query = (req.query as unknown) as KickAllRequest;

    const { error } = kickallScheme.validate(query);
    if (error) {
      const msg = `Kick all bad request ${error.message}`;
      console.log(msg);
      res.sendStatus(400);
      return;
    }

    core.kickAll();

    const msg = 'Kick all players';
    console.log(msg);
    res.status(200).send(msg);
  });

  app.get('/restart', (req, res) => {
    const query = (req.query as unknown) as RestartRequest;

    const { error, value } = restartScheme.validate(query);
    if (error) {
      const msg = `Restart bad request ${error.message}`;
      console.log(msg);
      res.status(400).send(msg);
      return;
    }

    const duration = Number(value.duration) * 60 * 1000;
    const inSeconds = Number(value.inSeconds);

    const msg = `Restart game after ${inSeconds} seconds, duration: ${duration}`;

    console.log(msg);
    core.game.restartInSeconds({
      duration,
      inSeconds,
    });

    return res.status(200).send(msg);
  });
};
