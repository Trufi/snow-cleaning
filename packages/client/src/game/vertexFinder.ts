import { ClientGraph, ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { getClosestPointOnLineSegment } from '@game/utils';
import { getAtFromSegment } from '@game/utils/graph';
import { vec2dist } from '@game/utils/vec2';
import RBush from 'rbush';

export interface VertexFinderPosition {
  edge: ClientGraphEdge;

  at: number;

  /**
   * Индекс сегмента грани, с учетом направления,
   * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
   */
  segmentIndex: number;

  /**
   * Описывает местоположение на текущем сегменте грани
   * Задается от 0 до 1
   */
  positionAtSegment: number;

  coords: number[];
}

export class VertexFinder {
  private tree = new RBush<{ vertex: ClientGraphVertex }>();

  constructor(private graph: ClientGraph) {
    this.tree.load(this.graph.vertices.map((vertex) => createPoint(vertex.coords, vertex)));
  }

  public findNearest(point: number[]) {
    const offset = 131072; // половина размера тайла 14-го зума

    const vertices = this.tree.search(createPointBBox(point, offset)).map((res) => res.vertex);
    const edgeIndices = new Set<number>();
    for (const vertex of vertices) {
      for (const edge of vertex.edges) {
        edgeIndices.add(edge.index);
      }
    }

    let minDistance = offset;
    let nearest:
      | { edge: ClientGraphEdge; segmentIndex: number; positionAtSegment: number; coords: number[] }
      | undefined;

    edgeIndices.forEach((index) => {
      const edge = this.graph.edges[index];

      for (let i = 0; i < edge.geometry.length - 1; i++) {
        const closestPoint = getClosestPointOnLineSegment(point, edge.geometry[i], edge.geometry[i + 1]);
        const distance = vec2dist(point, closestPoint.point);

        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            edge,
            segmentIndex: i,
            positionAtSegment: closestPoint.t,
            coords: closestPoint.point,
          };
        }
      }
    });

    if (nearest) {
      const position: VertexFinderPosition = {
        edge: nearest.edge,
        segmentIndex: nearest.segmentIndex,
        positionAtSegment: nearest.positionAtSegment,
        coords: nearest.coords,
        at: getAtFromSegment(nearest.edge, nearest.positionAtSegment, nearest.segmentIndex),
      };
      return position;
    }
  }
}

function createPoint(point: number[], vertex: ClientGraphVertex) {
  return {
    minX: point[0],
    minY: point[1],
    maxX: point[0],
    maxY: point[1],
    vertex,
  };
}

function createPointBBox(point: number[], offset: number) {
  return {
    minX: point[0] - offset,
    minY: point[1] - offset,
    maxX: point[0] + offset,
    maxY: point[1] + offset,
  };
}
