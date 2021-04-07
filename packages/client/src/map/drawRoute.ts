import { ClientGraphVertex } from '@game/data/clientGraph';
import { projectMapToGeo } from '../utils';

interface DrawnRoute {
  to: mapgl.Marker;
  from: mapgl.Marker;
  path: mapgl.Polyline;
}

let drawnRoute: DrawnRoute | undefined;

export function drawRoute(map: mapgl.Map, path: ClientGraphVertex[]) {
  if (drawnRoute) {
    drawnRoute.to.destroy();
    drawnRoute.from.destroy();
    drawnRoute.path.destroy();
  }

  drawnRoute = {
    to: new mapgl.Marker(map, {
      coordinates: projectMapToGeo(path[0].coords),
      label: { text: 'TO' },
    }),

    from: new mapgl.Marker(map, {
      coordinates: projectMapToGeo(path[path.length - 1].coords),
      label: { text: 'FROM' },
    }),

    path: new mapgl.Polyline(map, {
      coordinates: path.map((vertex) => projectMapToGeo(vertex.coords)),
      width: 10,
    }),
  };
}
