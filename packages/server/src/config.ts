import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  url: process.env.GAME_SERVER_URL || 'localhost',
  port: process.env.GAME_SERVER_PORT || 3001,
  clientsCheckInterval: 30000,

  serverGameStep: 30,
  clientSendChangesInterval: 100,
  clientPingInterval: 500,
  smoothPingTime: 2000,

  /**
   * Если на сервер приходят сообщения старее, чем этот порог, то мы их не принимаем
   * Сделано для того, чтобы игрок в офлайне всех не убил
   */
  discardMessageThreshold: 1000,

  polluteInterval: 100,
  clientPollutionUpdateInterval: 300,
};
