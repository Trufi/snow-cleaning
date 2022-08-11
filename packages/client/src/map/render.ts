import { Harvester } from '@game/utils/harvester';
import { ClientGraphEdge } from '@trufi/roads';
import { InterpolatedHarvester } from '../game/interpolatedHarvester';
import { RenderContext } from '../types';
import { LineBatch } from './lineBatch';
import { PointBatch, PointBatchEntity, PointIcon } from './pointBatch';

interface RenderPoint {
  harvester: InterpolatedHarvester | Harvester;
  point: PointBatchEntity;
}

export class Render {
  private canvas: HTMLCanvasElement;
  private renderContext: RenderContext;
  private pointBatch: PointBatch;
  private points: RenderPoint[];
  private lineBatch: LineBatch;

  constructor(public map: mapgl.Map, icons: PointIcon[]) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.background = 'transparent';
    this.canvas.style.opacity = String(0.7);
    // map.getContainer().appendChild(this.canvas);
    (map as any)._impl.getContainer().appendChild(this.canvas);

    this.points = [];

    const gl = this.canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      // premultiplyAlpha: true,
    }) as WebGLRenderingContext;

    const extensions = {
      OES_vertex_array_object: gl.getExtension('OES_vertex_array_object') as OES_vertex_array_object,
    };

    // Увеличиваем размер индекснового буфера для линий
    gl.getExtension('OES_element_index_uint');
    gl.getExtension('OES_standard_derivatives');

    this.renderContext = {
      gl,
      extensions,
    };

    window.addEventListener('resize', this.updateSize);
    this.updateSize();

    gl.clearColor(0, 0, 0, 0);

    this.pointBatch = new PointBatch(this.renderContext, icons);

    this.lineBatch = new LineBatch(this.renderContext);
  }

  public setPoints(harversters: Array<InterpolatedHarvester | Harvester>, min: number[], max: number[]) {
    this.points = harversters.map((harvester) => ({
      harvester,
      point: {
        icon: harvester.color,
        position: [0, 0],
      },
    }));

    this.pointBatch.setPoints(
      this.points.map((p) => p.point),
      min,
      max,
    );
  }

  public setLines(roadEdges: ClientGraphEdge[], min: number[], max: number[]) {
    this.lineBatch.setLines(roadEdges, min, max);
  }

  public updateLines(roadEdges: ClientGraphEdge[]) {
    this.lineBatch.updateColors(roadEdges);
  }

  public render() {
    for (let i = 0; i < this.points.length; i++) {
      const { point, harvester } = this.points[i];
      const coords = harvester.getCoords();
      point.position[0] = coords[0];
      point.position[1] = coords[1];
      point.icon = harvester.color;
    }

    const { gl } = this.renderContext;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const cameraMatrix = this.map.getProjectionMatrix();
    this.lineBatch.render(cameraMatrix, this.map.getSize(), this.map.getZoom());
    this.pointBatch.render(cameraMatrix, this.map.getSize(), this.map.getZoom());
  }

  private updateSize = () => {
    const size = this.map.getSize();

    this.canvas.width = size[0] * window.devicePixelRatio;
    this.canvas.height = size[1] * window.devicePixelRatio;
    this.canvas.style.width = size[0] + 'px';
    this.canvas.style.height = size[1] + 'px';

    this.renderContext.gl.viewport(0, 0, size[0] * window.devicePixelRatio, size[1] * window.devicePixelRatio);
  };
}
