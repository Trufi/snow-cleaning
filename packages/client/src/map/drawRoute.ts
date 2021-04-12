import { ClientGraphEdge, ClientGraphVertex } from '@game/data/clientGraph';
import { findEdgeFromVertexToVertex } from '@game/utils/graph';
import { Position } from '../types';
import { getCircleIcon, getSegment, projectMapToGeo } from '../utils';

interface DrawnRoute {
  path: mapgl.Polyline;
}

let drawnRoute: DrawnRoute | undefined;

export function drawRoute(map: mapgl.Map, fromPosition: Position, path: ClientGraphVertex[], toPosition: Position) {
  if (drawnRoute) {
    drawnRoute.path.destroy();
  }

  const coordinates: number[][] = [];

  const firstEdge = findEdgeFromVertexToVertex(path[0], path[1]);
  const lastEdge = findEdgeFromVertexToVertex(path[path.length - 2], path[path.length - 1]);
  if (!firstEdge || !lastEdge) {
    throw new Error(`Не найдена кривая при отрисовки поиска пути`);
  }

  if (firstEdge.edge === lastEdge.edge) {
    coordinates.push(...getPartGeometry(firstEdge.edge, fromPosition.at, toPosition.at));
  } else {
    coordinates.push(...getPartGeometry(firstEdge.edge, fromPosition.at, firstEdge.forward ? 1 : 0));

    for (let i = 1; i < path.length - 2; i++) {
      const a = path[i];
      const b = path[i + 1];

      const maybeEdge = findEdgeFromVertexToVertex(a, b);
      if (!maybeEdge) {
        throw new Error(`Не найдена кривая при отрисовки поиска пути`);
      }

      if (maybeEdge.forward) {
        for (let j = 0; j < maybeEdge.edge.geometry.length - 1; j++) {
          coordinates.push(maybeEdge.edge.geometry[j]);
        }
      } else {
        for (let j = maybeEdge.edge.geometry.length - 1; j > 0; j--) {
          coordinates.push(maybeEdge.edge.geometry[j]);
        }
      }
    }

    coordinates.push(...getPartGeometry(lastEdge.edge, lastEdge.forward ? 0 : 1, toPosition.at));
  }

  drawnRoute = {
    path: new mapgl.Polyline(map, {
      coordinates: coordinates.map((c) => projectMapToGeo(c)),
      width: 8,
      color: '#3388ff',
    }),
  };
}

function getPartGeometry(edge: ClientGraphEdge, fromAt: number, toAt: number) {
  const coordinates: number[][] = [];
  const segmentFrom = getSegment(edge, fromAt);
  const segmentTo = getSegment(edge, toAt);

  coordinates.push(segmentFrom.coords);
  if (fromAt < toAt) {
    for (let i = segmentFrom.segmentIndex + 1; i <= segmentTo.segmentIndex; i++) {
      coordinates.push(edge.geometry[i]);
    }
  } else {
    for (let i = segmentFrom.segmentIndex; i > segmentTo.segmentIndex; i--) {
      coordinates.push(edge.geometry[i]);
    }
  }
  coordinates.push(segmentTo.coords);

  return coordinates;
}

let marker: mapgl.Marker | undefined;
export function drawMarker(map: mapgl.Map, mapPoint: number[]) {
  if (!marker) {
    marker = new mapgl.Marker(map, {
      coordinates: projectMapToGeo(mapPoint),
      icon: getCircleIcon('#3388ff', 6),
    });
  } else {
    marker.setCoordinates(projectMapToGeo(mapPoint));
  }
  // marker?.destroy();
  // marker = new mapgl.Marker(map, {
  //   coordinates: projectMapToGeo(mapPoint),
  // });
}

let edgePolyline: mapgl.Polyline | undefined;
export function highlightEdge(map: mapgl.Map, edge: ClientGraphEdge) {
  edgePolyline?.destroy();
  edgePolyline = new mapgl.Polyline(map, {
    coordinates: edge.geometry.map((p) => projectMapToGeo(p)),
    width: 6,
    color: '#00ff00',
    zIndex: 5,
  });
}
