export const config = {
  url: process.env.GAME_SERVER_URL || 'localhost',
  port: process.env.GAME_SERVER_PORT || 3001,

  publicServerPort: process.env.PUBLIC_SERVER_PORT || 3001,
  publicWebSocketURL: process.env.PUBLIC_WS_URL || 'ws://localhost:3001',

  secretForCommands: process.env.GAME_SERVER_CMD_SECRET || 'secret',

  clientsCheckInterval: 30000,

  serverGameStep: 30,
  clientSendChangesInterval: 100,
  clientPingInterval: 500,
  smoothPingTime: 5000,

  /**
   * Если на сервер приходят сообщения старее, чем этот порог, то мы их не принимаем
   * Сделано для того, чтобы игрок в офлайне всех не убил
   */
  discardMessageThreshold: 1000,

  polluteInterval: 100,
  clientPollutionUpdateInterval: 300,

  harvesterSpeed: 75,

  colors: ['#0089ff', '#4db347', '#179298', '#a9b313', '#ff9f28', '#ff2828', '#ff28a9', '#c028ff'],
};
