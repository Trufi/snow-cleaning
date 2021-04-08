/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />

import { InitialState } from './core';
import { Render } from './map/render';
import { SimulationIcons } from './types';

const map = new mapgl.Map('map', {
  center: [82.9412, 55.0104],
  zoom: 14,
  key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
  zoomControl: false,
  style: '1db52c6e-66b6-4c99-9c83-5538fa962d43',
});

const iconSize: Array<[number, number]> = [
  [8, 10],
  [10, 15],
  [15, 18],
  [16, 20],
];

function getCircleIcon(color: string, radius: number, color2 = '#000', radius2 = 0): string {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${
    radius * 2
  } ${radius * 2}">
      <circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/>
      <circle fill="${color2}" cx="${radius}" cy="${radius}" r="${radius2}"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(icon)}`;
}

const icons: SimulationIcons = {
  virgin: {
    width: iconSize,
    height: iconSize,
    url: getCircleIcon('#0089ff', 10, '#ffffff', 5),
  },
};

const render = new Render(map, icons);

new InitialState(render);
