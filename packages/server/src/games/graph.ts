import { unpackGraph } from '@game/data/pack';
import { Graph } from '@game/data/types';
import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from './types';

export function prepareGraph(graph: Graph): ClientGraph {
  // Распаковываем граф пришедший с сервера
  unpackGraph(graph);

  // На самом деле этот тот же объект graph, мы его мутируем в процессе,
  // а отдельная переменная для TS
  const clientGraph: ClientGraph = graph as any;

  /**
   * А также вынимаем из вершин грани примыкающие к домам и ставим в их отдельное поле houseEdge,
   * чтобы потом можно было легко его найти и не делать find по всем граням вершины.
   */
  graph.vertices.forEach((vertex, index) => {
    const clientVertex: ClientGraphVertex = vertex as any;
    clientVertex.index = index;

    // Удаляем все грани примыкающие к домам
    let houseEdgeVertexIndex = vertex.edges.findIndex((i) => graph.edges[i].type === 'house');
    while (houseEdgeVertexIndex !== -1) {
      clientVertex.edges.splice(houseEdgeVertexIndex, 1);
      houseEdgeVertexIndex = vertex.edges.findIndex((i) => graph.edges[i].type === 'house');
    }

    // Заменяем индексы граней на ссылки
    clientVertex.edges = vertex.edges.map((edgeIndex) => clientGraph.edges[edgeIndex]);
  });

  graph.edges.forEach((edge, index) => {
    const clientEdge: ClientGraphEdge = edge as any;
    clientEdge.index = index;
    clientEdge.pollution = 0;

    // Заменяем индексы вершин на их ссылки для удобства в дальнейшем
    clientEdge.a = clientGraph.vertices[edge.a];
    clientEdge.b = clientGraph.vertices[edge.b];
  });

  return clientGraph;
}
