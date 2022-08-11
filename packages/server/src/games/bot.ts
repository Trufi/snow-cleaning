import { Harvester } from '@game/utils/harvester';
import { SnowClientGraph, SnowClientGraphEdge } from '@game/utils/types';
import { breadthFirstTraversalFromMidway } from '@trufi/roads';
import { adjectives, animals, names, uniqueNamesGenerator } from 'unique-names-generator';
import { config } from '../config';
import { getNextColorIndex, random } from '../utils';

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

  constructor(graph: SnowClientGraph, private createTime: number) {
    const enabledEdges = graph.edges.filter((edge) => edge.userData.enabled);
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
      const route = breadthFirstTraversalFromMidway(
        this.harvester.getPosition(),
        (routeLength, _next, _current, edge: SnowClientGraphEdge) => {
          if (routeLength > 5 || edge.userData.enabled === false) {
            return;
          }
          return edge.length * (edge.userData.pollution + Math.random() * 0.5) - edge.length / 10;
        },
      );
      if (route) {
        this.harvester.setRoute(now, route);
      }
    }

    this.harvester.updateMoving(now);
  }

  public getDebugInfo() {
    return {
      id: this.id,
      name: this.name,
      harvester: this.harvester.getDebugInfo(),
    };
  }
}
