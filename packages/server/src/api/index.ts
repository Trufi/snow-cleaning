import * as express from 'express';
import * as Joi from 'joi';
import { mapMap } from '@game/utils';
import { KickAllRequest, StateRequest } from './types';
import { Core } from '../core';

const secret = 'secretcode223';

export const applyApiRoutes = (app: express.Express, core: Core) => {
  // healthcheck
  app.get('/', (_req, res) => res.sendStatus(200));

  const stateScheme = Joi.object().keys({
    secret: Joi.string().valid(secret).required(),
  });

  app.get('/state', (req, res) => {
    const query = (req.query as unknown) as StateRequest;

    const { error } = stateScheme.validate(query);
    if (error) {
      const msg = `State bad request ${error.message}`;
      console.log(msg);
      res.sendStatus(400);
      return;
    }

    const result = {
      url: core.url,
      connections: mapMap(core.connections, ({ id, status }) => ({ id, status })),
      game: core.game.getDebugInfo(),
    };
    res.send(JSON.stringify(result));
  });

  const kickallScheme = Joi.object().keys({
    secret: Joi.string().valid(secret).required(),
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
};
