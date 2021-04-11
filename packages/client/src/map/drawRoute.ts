import { ClientGraphVertex } from '@game/data/clientGraph';
import { projectMapToGeo } from '../utils';

interface DrawnRoute {
  path: mapgl.Polyline;
}

let drawnRoute: DrawnRoute | undefined;

export function drawRoute(map: mapgl.Map, path: ClientGraphVertex[]) {
  if (drawnRoute) {
    drawnRoute.path.destroy();
  }

  const coordinates: number[][] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];

    const edgeVector = i === path.length - 2 ? b : a;

    const edge = edgeVector.edges.find((edge) => (edge.a === a && edge.b === b) || (edge.b === a && edge.a === b));
    if (!edge) {
      throw new Error(`Не найдена кривая при отрисовки поиска пути`);
    }
    if (edge.a === a) {
      for (let j = 0; j < edge.geometry.length - 1; j++) {
        coordinates.push(edge.geometry[j]);
      }
    } else {
      for (let j = edge.geometry.length - 1; j > 0; j--) {
        coordinates.push(edge.geometry[j]);
      }
    }

    if (i === path.length - 2) {
      coordinates.push(b.coords);
    }
  }

  drawnRoute = {
    path: new mapgl.Polyline(map, {
      coordinates: coordinates.map((c) => projectMapToGeo(c)),
      width: 10,
      color: '#3388ff77',
    }),
  };
}

let marker: mapgl.Marker | undefined;
export function drawMarker(map: mapgl.Map, mapPoint: number[]) {
  marker?.destroy();
  marker = new mapgl.Marker(map, {
    coordinates: projectMapToGeo(mapPoint),
  });
}
