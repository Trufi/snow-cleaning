import { unpackGraph } from '@game/data/pack';
import { Graph } from '@game/data/types';
import { ClientGraph, ClientGraphEdge } from './types';

export function prepareGraph(graph: Graph): ClientGraph {
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
