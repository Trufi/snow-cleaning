/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />

import { config } from '@game/server/config';
import { addStubDataToGraph } from '@game/utils';
import { DataGraph } from '@trufi/roads';
import { Snow } from 'mapgl-snow';
import { InitialState } from './core';
import { PointIcon, PointIconSize } from './map/pointBatch';
import { Render } from './map/render';
import { getCircleIcon } from './utils';

const map = ((window as any).map = new mapgl.Map('map', {
  center: [82.9412, 55.0104],
  zoom: 15,
  pitch: 15,
  key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
  zoomControl: false,
  style: '1db52c6e-66b6-4c99-9c83-5538fa962d43',
}));

window.addEventListener('resize', () => map.invalidateSize());

const iconSize: PointIconSize = [
  [8, 10],
  [10, 15],
  [15, 18],
  [16, 20],
];

const icons: PointIcon[] = config.colors.map((color) => ({
  width: iconSize,
  height: iconSize,
  url: getCircleIcon(color, 10, '#ffffff', 5),
}));

const render = new Render(map, icons);

new Snow(map as any, { skipWaitingForMapIdle: true });

fetch(`${location.protocol}//${location.hostname}:${config.port}/assets/novosibirsk.json`)
  .then((res) => res.json())
  .then((dataGraph: DataGraph) => {
    addStubDataToGraph(dataGraph);

    // graph.vertices.forEach((vertex) => {
    //   new mapgl.Label(map, {
    //     coordinates: projectMapToGeo(vertex.coords),
    //     text: String(vertex.index),
    //   });
    // });

    new InitialState(dataGraph, render);
  });
