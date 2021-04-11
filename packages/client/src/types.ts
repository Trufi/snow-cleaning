import { ClientGraphEdge } from '@game/data/clientGraph';

export interface Position {
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

export interface Human {
  coords: number[];

  forward: boolean;
  edge: number;

  /**
   * Индекс сегмента грани, с учетом направления,
   * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
   */
  segment: number;
  passed: number;

  startTime: number;
}

export type SimulationIconSize = number | Array<[number, number]>;

export interface SimulationIcons {
  virgin: {
    width: SimulationIconSize;
    height: SimulationIconSize;
    url: string;
  };
}

export interface SimulationOptions {
  icons: SimulationIcons;
}

export interface RenderContext {
  gl: WebGLRenderingContext;
  extensions: { OES_vertex_array_object: OES_vertex_array_object };
}
