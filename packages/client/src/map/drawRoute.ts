import { SnowClientGraphEdge } from '@game/utils/types';
import { getRouteGeometry, Route } from '@trufi/roads';
import { circleIcon, mapPointToLngLat } from '@trufi/utils';

interface DrawnRoute {
  path: mapgl.Polyline;
}

let drawnRoute: DrawnRoute | undefined;

export function drawRoute(map: mapgl.Map, route: Route) {
  if (drawnRoute) {
    drawnRoute.path.destroy();
  }

  drawnRoute = {
    path: new mapgl.Polyline(map, {
      coordinates: getRouteGeometry(route).map((c) => mapPointToLngLat(c)),
      width: 8,
      color: '#3388ff55',
    }),
  };
}

let marker: mapgl.Marker | undefined;
export function drawMarker(map: mapgl.Map, mapPoint: number[]) {
  if (!marker) {
    marker = new mapgl.Marker(map, {
      coordinates: mapPointToLngLat(mapPoint),
      icon: circleIcon('#3388ff55', 6),
    });
  } else {
    marker.setCoordinates(mapPointToLngLat(mapPoint));
  }
  // marker?.destroy();
  // marker = new mapgl.Marker(map, {
  //   coordinates: projectMapToGeo(mapPoint),
  // });
}

let edgePolyline: mapgl.Polyline | undefined;
export function highlightEdge(map: mapgl.Map, edge: SnowClientGraphEdge) {
  edgePolyline?.destroy();
  edgePolyline = new mapgl.Polyline(map, {
    coordinates: edge.geometry.map((p) => mapPointToLngLat(p)),
    width: 6,
    color: '#00ff00',
    zIndex: 5,
  });
}
