import * as vec2 from '@2gis/gl-matrix/vec2';
import { Map } from '@2gis/mapgl/types';
import { Graph } from '@game/data/types';
import { unpackGraph } from '@game/data/pack';

import { Render } from './map/render';
import { projectGeoToMap, createRandomFunction, clamp } from './utils';
import {
  Human,
  SimulationStartOptions,
  SimulationFilterOptions,
  ClientGraph,
  ClientGraphVertex,
  SimulationOptions,
  ClientGraphEdge,
} from './types';

export class Simulation {
  private options: SimulationStartOptions = {
    randomSeed: 15,
    humansCount: 4000,
    humanSpeed: 100,
    dataUrl: '',
  };
  private render: Render;
  private graph?: ClientGraph;
  private random: () => number;
  private humans: Human[];
  private simulationTime: number;
  private lastPolluteTime: number;
  private paused: boolean;
  private speed: number;
  private roadEdges: ClientGraphEdge[];

  constructor(map: Map, options: SimulationOptions) {
    this.render = new Render(map, options.icons);
    this.random = createRandomFunction(this.options.randomSeed);
    this.humans = [];
    this.simulationTime = 0;
    this.lastPolluteTime = 0;
    this.paused = false;
    this.speed = 1;
    this.roadEdges = [];
    requestAnimationFrame(this.update);
  }

  /**
   * Стартует симуляцию с заданными параметрами
   */
  public start(options: SimulationStartOptions, filterOptions?: SimulationFilterOptions) {
    this.options = options;
    this.stop();

    fetch(options.dataUrl)
      .then((r) => r.json())
      .then((graph: Graph) => {
        this.graph = prepareGraph(graph);

        const vertexInRangeIndices: number[] = [];
        if (filterOptions) {
          const mapCenter = projectGeoToMap(filterOptions.center);
          this.graph.vertices.forEach((vertex, i) => {
            if (vertex.type !== 'null' && vec2.dist(vertex.coords, mapCenter) < filterOptions.radius * 100) {
              vertexInRangeIndices.push(i);
            }
          });
        } else {
          this.graph.vertices.forEach((vertex, i) => {
            if (vertex.type !== 'null') {
              vertexInRangeIndices.push(i);
            }
          });
        }

        if (!vertexInRangeIndices.length) {
          return;
        }

        const notHouseVertexIndices = vertexInRangeIndices.filter((index) => graph.vertices[index].type !== 'house');

        for (let i = 0; i < options.humansCount; i++) {
          const human = createHuman(this.graph, this.random, notHouseVertexIndices);
          this.humans.push(human);
        }

        this.render.setPoints(this.humans, graph.min, graph.max);

        this.roadEdges = this.graph.edges.filter((edge) => edge.type === 'road');
        this.render.setLines(this.roadEdges, graph.min, graph.max);
      });
  }

  /**
   * Полностью останавливают и удаляет симуляцию
   */
  public stop() {
    this.render.setPoints([], [0, 0], [0, 0]);
    this.random = createRandomFunction(this.options.randomSeed);
    this.humans = [];
    this.graph = undefined;
    this.simulationTime = 0;
    this.paused = false;
    this.speed = 1;
  }

  /**
   * Ставит симуляцию на паузу, но не удаляет с карты ничего
   */
  public pause() {
    this.paused = true;
  }

  /**
   * Возобновляет симуляцию поставленную на паузу
   */
  public play() {
    this.paused = false;
  }

  public setSpeed(s: number) {
    this.speed = s;
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const graph = this.graph;

    if (graph && !this.paused) {
      const delta = 16;
      this.simulationTime += delta * this.speed;

      this.humans.forEach((human) => updateHuman(graph, this.random, this.options, human, this.simulationTime));

      if (this.simulationTime - this.lastPolluteTime < 100) {
        this.polluteRoads(100);
        this.lastPolluteTime = this.simulationTime;
      }
      this.cleanRoads();
    }

    // Рендерить все равно нужно, чтобы пустой граф очищался
    this.render.render();
  };

  private polluteRoads(dt: number) {
    const graph = this.graph;

    if (!graph) {
      return;
    }

    const pollutionFactor = 0.005;
    graph.edges.forEach((edge) => {
      edge.pollution = clamp(edge.pollution + (dt * pollutionFactor) / 1000, 0, 1);
    });

    this.render.updateLines(this.roadEdges);
  }

  private cleanRoads() {
    const graph = this.graph;
    if (!graph) {
      return;
    }
    this.humans.forEach((human) => {
      const edge = graph.edges[human.edge];
      edge.pollution = 0;
    });
  }
}

function createHuman(graph: ClientGraph, random: () => number, vertexIndices: number[]) {
  const vertexFromIndex = vertexIndices[Math.floor(random() * vertexIndices.length)];
  const vertexFrom = graph.vertices[vertexFromIndex];

  const edgeIndex = vertexFrom.edges.length
    ? vertexFrom.edges[Math.floor(random() * vertexFrom.edges.length)]
    : vertexFrom.houseEdge;
  const edge = graph.edges[edgeIndex];

  const forward = edge.a === vertexFromIndex;

  const human: Human = {
    coords: vertexFrom.coords.slice(0),
    forward,
    edge: edgeIndex,

    segment: 0,
    passed: 0,
    startTime: 0,
  };

  return human;
}

function updateHuman(
  graph: ClientGraph,
  random: () => number,
  options: SimulationStartOptions,
  human: Human,
  now: number,
) {
  const humanEdge = graph.edges[human.edge];
  const geometry = humanEdge.geometry;

  const distance = options.humanSpeed * (now - human.startTime);

  let passed = human.passed;
  let ended = true;

  for (let i = human.segment; i < geometry.length - 1; i++) {
    const segmentA = human.forward ? geometry[i] : geometry[geometry.length - 1 - i];
    const segmentB = human.forward ? geometry[i + 1] : geometry[geometry.length - 1 - (i + 1)];

    const length = vec2.dist(segmentB, segmentA);
    if (distance < passed + length) {
      human.segment = i;
      human.passed = passed;
      const t = clamp((distance - passed) / length, 0, 1);
      vec2.lerp(human.coords, segmentA, segmentB, t);
      ended = false;
      break;
    }
    passed += length;
  }

  if (ended) {
    // найти следующую цель
    const endVertexIndex = human.forward ? humanEdge.b : humanEdge.a;
    const endVertex = graph.vertices[endVertexIndex];

    human.edge = chooseNextEdge(random, human.edge, endVertex);
    human.startTime = now;
    human.segment = 0;
    human.passed = 0;

    const newHumanEdge = graph.edges[human.edge];
    human.forward = newHumanEdge.a === endVertexIndex;
  }
}

function chooseNextEdge(random: () => number, prevEdgeId: number, vertex: ClientGraphVertex) {
  const edgeIndices = vertex.edges;
  let edgeIndex = Math.floor(random() * edgeIndices.length);

  // Если выбралась предыдущая грань, то попробуй выбрать другую
  if (edgeIndices.length > 1 && edgeIndices[edgeIndex] === prevEdgeId) {
    edgeIndex = (edgeIndex + 1) % edgeIndices.length;
  }

  if (edgeIndices[edgeIndex] === undefined) {
    console.log('dddd');
  }

  return edgeIndices[edgeIndex];
}

function prepareGraph(graph: Graph): ClientGraph {
  // Распаковываем граф пришедший с сервера
  unpackGraph(graph);

  /**
   * А также вынимаем из вершин грани примыкающие к домам и ставим в их отдельное поле houseEdge,
   * чтобы потом можно было легко его найти и не делать find по всем граням вершины.
   */
  graph.vertices.forEach((v) => {
    (v as any).houseEdge = -1;

    let houseEdgeVertexIndex = v.edges.findIndex((i) => graph.edges[i].type === 'house');

    while (houseEdgeVertexIndex !== -1) {
      (v as any).houseEdge = v.edges[houseEdgeVertexIndex];
      v.edges.splice(houseEdgeVertexIndex, 1);
      houseEdgeVertexIndex = v.edges.findIndex((i) => graph.edges[i].type === 'house');
    }
  });

  graph.edges.forEach((edge) => {
    (edge as ClientGraphEdge).pollution = 0;
  });

  return graph as any;
}
