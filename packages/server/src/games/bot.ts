import { uniqueNamesGenerator, adjectives, animals, names } from 'unique-names-generator';
import { ClientGraph, ClientGraphEdge } from '@game/data/clientGraph';
import { findEdgeFromVertexToVertex } from '@game/utils/graph';
import { breadthFirstTraversal } from '@game/utils/pathfind';
import { Harvester } from '@game/utils/harvester';
import { getNextColorIndex, random } from '../utils';
import { config } from '../config';

let idCounter = 0;

export class Bot {
  public readonly id = `bot/${idCounter++}`;
  public readonly type = 'bot';
  public readonly name = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, names],
    length: 2,
    separator: '',
    style: 'capital',
    seed: Math.round(Math.random() * 10000),
  });
  public readonly harvester: Harvester;

  /**
   * Время жизни: 20сек + [0 - 10]минут
   */
  private liveTime = 20000 + random() * 10 * 60 * 1000;

  constructor(graph: ClientGraph, private createTime: number) {
    const enabledEdges = graph.edges.filter((edge) => edge.enabled);
    const edge = enabledEdges[Math.floor(random() * enabledEdges.length)];
    this.harvester = new Harvester({
      edge,
      at: 0,
      speed: config.harvesterSpeed,
      color: getNextColorIndex(),
      score: 0,
    });
  }

  public timeIsPassed(now: number) {
    return now - this.createTime > this.liveTime;
  }

  public update(now: number) {
    if (this.harvester.isFinishedRoute()) {
      const position = this.harvester.getPosition();
      const route = findBestRoute(position.edge);
      if (route) {
        this.harvester.setRoute(now, position.at, route.route, route.toAt);
      }
    }

    this.harvester.updateMoving(now);
  }
}

function findBestRoute(edge: ClientGraphEdge) {
  const route = breadthFirstTraversal(edge.a, (_pollution, routeLength) => {
    if (routeLength > 5) {
      return false;
    }

    return true;
  });

  if (!route) {
    return;
  }

  if (route[1] !== edge.b) {
    route.unshift(edge.b);
  }

  const lastEdge = findEdgeFromVertexToVertex(route[route.length - 2], route[route.length - 1]);
  const toAt = lastEdge?.forward ? 1 : 0;

  return { route, toAt };
}
