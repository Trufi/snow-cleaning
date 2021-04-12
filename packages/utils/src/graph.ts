import { ClientGraphVertex } from '@game/data/clientGraph';

export function findEdgeFromVertexToVertex(fromVertex: ClientGraphVertex, toVertex: ClientGraphVertex) {
  for (const edge of fromVertex.edges) {
    if (edge.a === fromVertex && edge.b === toVertex) {
      return {
        edge,
        forward: true,
      };
    }

    if (edge.a === toVertex && edge.b === fromVertex) {
      return {
        edge,
        forward: false,
      };
    }
  }
}
