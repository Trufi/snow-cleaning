import { SnowClientGraph, SnowClientGraphEdge } from '@game/utils/types';
import { Roads } from '@trufi/roads';
import { clamp, vec2dist } from '@trufi/utils';
import { config } from '../../config';

const radius = 3 * 1000 * 100;

const intensivePollutionDuration = 10 * 1000;
const intensivePollutionSpeed = 0.1;

const normalPollutionSpeed = 0.001;

export class BlizzardEncounter {
  public readonly type = 'blizzard' as const;
  public readonly duration = 120 * 1000;
  public readonly center: number[];

  private lastPollutionTime = 0;
  private edges: SnowClientGraphEdge[];
  private readyPercent: number = 0;
  private graph: SnowClientGraph;

  constructor(
    public readonly startTime: number,
    private roads: Roads,
    private onFinish: () => void,
  ) {
    this.graph = roads.graph;
    const randomPoint = getRandomPoint(this.graph, radius);
    const neareast = this.roads.findNearestVertex(randomPoint);
    if (neareast) {
      this.center = neareast.coords;
    } else {
      this.center = this.graph.vertices[0].coords;
    }

    this.edges = enableEdgesInRadius(this.graph, this.center, radius);
  }

  public getReadyPercent() {
    return this.readyPercent;
  }

  public getTimeLeft(time: number) {
    const timeSpent = time - this.startTime;
    return this.duration - timeSpent;
  }

  public update(time: number) {
    const timeDuration = time - this.startTime;

    const timeFromLastPollution = time - this.lastPollutionTime;
    if (timeFromLastPollution > config.polluteInterval) {
      this.lastPollutionTime = time;
      const speed = timeDuration < intensivePollutionDuration ? intensivePollutionSpeed : normalPollutionSpeed;
      polluteRoads(this.graph, timeFromLastPollution, speed);
      this.readyPercent = calcCleanlessPercent(this.edges);
    }

    if (timeDuration > this.duration || (this.readyPercent < 0.01 && timeDuration > intensivePollutionDuration)) {
      this.onFinish();
    }
  }
}

function getRandomPoint(graph: SnowClientGraph, padding: number) {
  const min = [graph.min[0] + padding, graph.min[1] + padding];
  const max = [graph.max[0] - padding, graph.max[1] - padding];

  return [min[0] + Math.random() * (max[0] - min[0]), min[1] + Math.random() * (max[1] - min[1])];
}

function enableEdgesInRadius(graph: SnowClientGraph, center: number[], radius: number) {
  const encounterEdges: SnowClientGraphEdge[] = [];
  for (const edge of graph.edges) {
    if (vec2dist(edge.a.coords, center) < radius || vec2dist(edge.b.coords, center) < radius) {
      edge.userData.enabled = true;
      encounterEdges.push(edge);
    } else {
      edge.userData.enabled = false;
    }
  }
  return encounterEdges;
}

function polluteRoads(graph: SnowClientGraph, timeFromLastPollution: number, speed: number) {
  const pollution = (speed * timeFromLastPollution) / 1000;
  graph.edges.forEach((edge) => {
    if (edge.userData.enabled) {
      edge.userData.pollution = clamp(edge.userData.pollution + pollution, 0, 1);
    }
  });
}

function calcCleanlessPercent(edges: SnowClientGraphEdge[]) {
  let maxPollution = 0;
  let currentPollution = 0;

  for (const edge of edges) {
    maxPollution += edge.length;
    currentPollution += edge.length * edge.userData.pollution;
  }

  return 1 - currentPollution / maxPollution;
}
