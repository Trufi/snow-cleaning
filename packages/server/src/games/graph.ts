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

  // Удаляем все грани примыкающие к домам, чтобы не выбирать их в процессе езды
  clientGraph.vertices.forEach((vertex) => {
    let houseEdgeVertexIndex = vertex.edges.findIndex((edge) => edge.type === 'house');
    while (houseEdgeVertexIndex !== -1) {
      vertex.edges.splice(houseEdgeVertexIndex, 1);
      houseEdgeVertexIndex = vertex.edges.findIndex((edge) => edge.type === 'house');
    }
  });

  return clientGraph;
}
