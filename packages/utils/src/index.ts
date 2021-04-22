import { DataGraph } from '@trufi/roads';
import { SnowClientGraph } from './types';

export function addStubDataToGraph(dataGraph: DataGraph) {
  const graph: SnowClientGraph = dataGraph as any;

  graph.edges.forEach((edge) => {
    edge.userData = {
      enabled: false,
      pollution: 0,
    };
  });
}

export type ObjectElement<T> = T[keyof T];
export type ArrayElement<ArrayType> = ArrayType extends Array<infer ElementType> ? ElementType : never;
