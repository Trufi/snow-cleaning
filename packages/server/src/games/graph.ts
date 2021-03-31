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
  graph.vertices.forEach((v) => {
    const clientVertex: ClientGraphVertex = v as any;

    // Удаляем все грани примыкающие к домам
    let houseEdgeVertexIndex = v.edges.findIndex((i) => graph.edges[i].type === 'house');
    while (houseEdgeVertexIndex !== -1) {
      clientVertex.edges.splice(houseEdgeVertexIndex, 1);
      houseEdgeVertexIndex = v.edges.findIndex((i) => graph.edges[i].type === 'house');
    }
  });

  graph.edges.forEach((edge) => {
    const clientEdge: ClientGraphEdge = edge as any;
    clientEdge.pollution = 0;

    // Заменяем индексы вершин на их ссылки для удобства в дальнейшем
    clientEdge.a = clientGraph.vertices[edge.a];
    clientEdge.b = clientGraph.vertices[edge.b];
  });

  return clientGraph;
}
