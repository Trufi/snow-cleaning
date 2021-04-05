import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { FlatQueue } from './flatqueue';

const list = new FlatQueue<ClientGraphVertex>();

let idCounter = 0;

function heuristic(dx: number, dy: number) {
  return dx + dy;
}

export function pathFind(firstVertex: ClientGraphVertex, endVertex: ClientGraphVertex) {
  const id = idCounter++;

  list.clear();

  firstVertex.pathFind.f = 0;
  firstVertex.pathFind.g = 0;
  firstVertex.pathFind.id = id;
  firstVertex.pathFind.parent = undefined;

  list.push(firstVertex, 0);

  let current = list.pop();
  while (current && current !== endVertex) {
    for (const edge of current.edges) {
      const next = anotherEdgeVertex(edge, current);
      if (next.pathFind.id !== id) {
        next.pathFind.g = current.pathFind.g + edge.length;
        next.pathFind.f =
          next.pathFind.g +
          heuristic(Math.abs(next.coords[0] - endVertex.coords[0]), Math.abs(next.coords[1] - endVertex.coords[1]));
        next.pathFind.parent = current;
        next.pathFind.id = id;
        list.push(next, next.pathFind.f);
      }
      // TODO: надо обновить позицию существующего элемента в очереди https://github.com/qiao/PathFinding.js/blob/master/src/finders/AStarFinder.js#L116
    }

    current = list.pop();
  }

  // Был найден путь
  if (current) {
    const route: ClientGraphVertex[] = [];

    let first: ClientGraphVertex | undefined = current;
    while (first) {
      route.push(first);
      first = first.pathFind.parent;
    }

    route.reverse();

    return route;
  }
}

function anotherEdgeVertex(edge: ClientGraphEdge, from: ClientGraphVertex) {
  return edge.a === from ? edge.b : edge.a;
}
