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

export interface SimulationStartOptions {
    /**
     * Весь рандом в симуляции детерминированные, это его первоначальное зерно
     */
    randomSeed: number;

    /**
     * Общее количество людей
     */
    humansCount: number;

    /**
     * Скорость людей в папугаях
     */
    humanSpeed: number;

    /**
     * URL, с которого будут скачиваться данные для симуляции
     */
    dataUrl: string;
}

export interface SimulationFilterOptions {
    center: number[];
    radius: number;
}

export interface RenderContext {
    gl: WebGLRenderingContext;
    extensions: { OES_vertex_array_object: OES_vertex_array_object };
}

export interface ClientGraphVertex {
    edges: number[]; // индексы ребер
    coords: number[];
    type: 'road' | 'house' | 'null';
    houseEdge: number; // -1 если нет
}

export interface ClientGraphEdge {
    geometry: number[][];
    a: number;
    b: number;
    type: 'road' | 'house' | 'null';
    pollution: number;
}

export interface ClientGraph {
    vertices: ClientGraphVertex[];
    edges: ClientGraphEdge[];
    center: number[];
    min: number[];
    max: number[];
}
