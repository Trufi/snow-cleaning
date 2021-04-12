/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />

import { prepareGraph } from '@game/data/clientGraph';
import { Snow } from 'mapgl-snow';
import { InitialState } from './core';
import { Render } from './map/render';
import { SimulationIcons } from './types';
import { getCircleIcon } from './utils';

const map = ((window as any).map = new mapgl.Map('map', {
  center: [82.9412, 55.0104],
  zoom: 14,
  key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
  zoomControl: false,
  style: '1db52c6e-66b6-4c99-9c83-5538fa962d43',
}));

window.addEventListener('resize', () => map.invalidateSize());

const iconSize: Array<[number, number]> = [
  [8, 10],
  [10, 15],
  [15, 18],
  [16, 20],
];

const icons: SimulationIcons = {
  virgin: {
    width: iconSize,
    height: iconSize,
    url: getCircleIcon('#0089ff', 10, '#ffffff', 5),
  },
};

const render = new Render(map, icons);

new Snow(map as any);

// const serverURL = '192.168.3.17:3001';
const serverURL = 'localhost:3001';

fetch(`http://${serverURL}/assets/novosibirsk.json`)
  .then((res) => res.json())
  .then((rawGraph: any) => {
    const graph = prepareGraph(rawGraph);

    // graph.vertices.forEach((vertex) => {
    //   new mapgl.Label(map, {
    //     coordinates: projectMapToGeo(vertex.coords),
    //     text: String(vertex.index),
    //   });
    // });

    new InitialState(graph, render, serverURL);
  });
