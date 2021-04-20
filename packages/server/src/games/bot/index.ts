import { ClientGraph, ClientGraphEdge } from '@game/data/clientGraph';
import { breadthFirstTraversal } from '@game/utils/pathfind';
import { Harvester } from '@game/utils/harvester';
import { random } from '../../utils';
import { config } from '../../config';

let idCounter = 0;

export class Bot {
  public readonly id = `bot/${idCounter++}`;
  public readonly type = 'bot';
  public readonly name = `Kolyan${Math.round(random() * 100)}`;
  public readonly harvester: Harvester;

  constructor(graph: ClientGraph) {
    const enabledEdges = graph.edges.filter((edge) => edge.enabled);
    const edge = enabledEdges[Math.floor(random() * enabledEdges.length)];
    this.harvester = new Harvester(graph, {
      type: 'bot',
      edge,
      at: 0,
      speed: config.harvesterSpeed,
    });
  }

  public update(now: number) {
    if (this.harvester.isFinishedRoute()) {
      const position = this.harvester.getPosition();
      const route = findBestRoute(position.edge);
      if (route) {
        this.harvester.setRoute(now, position.at, route, 0);
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

  return route;
}
