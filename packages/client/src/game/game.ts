import { ClientGraph, prepareGraph } from '@game/data/clientGraph';
import { ServerMsg } from '@game/server/messages';

const rawGraph = require('../../assets/novosibirsk.json');

export class Game {
  private graph: ClientGraph;

  constructor(startData: ServerMsg['startData']) {
    this.graph = prepareGraph(rawGraph);
  }
}
