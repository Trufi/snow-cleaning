import Buffer from '2gl/Buffer';
import BufferChannel from '2gl/BufferChannel';
import Shader from '2gl/Shader';
import ShaderProgram from '2gl/ShaderProgram';
import Vao from '2gl/Vao';
import { ClientGraphEdge } from '@trufi/roads';
import { mat4create, mat4fromTranslationScale, mat4mul, vec4copy } from '@trufi/utils';
import { RenderContext } from '../../types';
import { createEmptyGeneratorData, generate, GeneratorEdgeData, lineStride } from './generator';
import { Sample, sampleColor } from './sample';
import fragmentShaderSource from './shader.fsh';
import vertexShaderSource from './shader.vsh';
import { hslToRgb } from './utils';

const tempMatrix = new Float32Array(16);

const colors: Sample = [
  [0.05, [50 / 360, 0.5, 0.5, 1]],
  [0.3, [50 / 360, 0.5, 0.5, 255]],
  [1, [0 / 360, 0.5, 0.5, 255]],
];

function getColor(pollution: number) {
  if (pollution < 0.05) {
    return [0, 0, 0, 0];
  }
  const hsl = sampleColor(colors, pollution);
  const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
  return [rgb[0], rgb[1], rgb[2], 255];
}

function createRoadVao(buffer: Buffer, program: ShaderProgram) {
  const vertexBuffer = new BufferChannel(buffer, {
    itemSize: 2,
    dataType: Buffer.Float,
    stride: lineStride,
    offset: 0,
    normalized: false,
  });

  const normalsBuffer = new BufferChannel(buffer, {
    itemSize: 4,
    dataType: Buffer.Byte,
    stride: lineStride,
    offset: 8,
    normalized: false,
  });

  const colorBuffer = new BufferChannel(buffer, {
    itemSize: 4,
    dataType: Buffer.UnsignedByte,
    stride: lineStride,
    offset: 12,
    normalized: true,
  });

  return new Vao(program, {
    a_vec2_vertex: vertexBuffer,
    a_vec4_normals: normalsBuffer,
    a_vec4_color: colorBuffer,
  });
}

export class LineBatch {
  private generatorData = createEmptyGeneratorData();
  private program = new ShaderProgram({
    vertex: new Shader('vertex', vertexShaderSource),
    fragment: new Shader('fragment', fragmentShaderSource),
    uniforms: [
      { name: 'u_mat4_mvp', type: 'mat4' },
      { name: 'u_float_width', type: '1f' },
      { name: 'u_float_tile_to_pixel_ratio', type: '1f' },
    ],
    attributes: [
      { name: 'a_vec2_vertex', location: 0 },
      { name: 'a_vec4_normals', location: 1 },
      { name: 'a_vec4_color', location: 3 },
      { name: 'index', index: true },
    ],
  });
  private matrix = mat4create();
  private elementBuffer?: Buffer;
  private indexBuffer?: Buffer;
  private vao?: Vao;
  private size: number = 0;

  constructor(private renderContext: RenderContext) {}

  public setLines(roadEdges: ClientGraphEdge[], min: number[], max: number[]) {
    const size = [max[0] - min[0], max[1] - min[1]];
    this.size = Math.max(size[0], size[1]);
    mat4fromTranslationScale(this.matrix, [min[0], min[1], 0], [size[0], size[1], 1]);

    for (const edge of roadEdges) {
      // Будем рисовать звенья: участвующие в энкаунтере или те, что не пусты
      if (!edge.userData.enabled && edge.userData.pollution === 0) {
        continue;
      }

      const edgeData: GeneratorEdgeData = {
        px: [],
        py: [],
        colors: [],
        edge,
      };
      this.generatorData.edges.push(edgeData);

      const color = getColor(edgeData.edge.userData.pollution);

      for (const position of edge.geometry) {
        const x = (position[0] - min[0]) / size[0];
        const y = (position[1] - min[1]) / size[1];
        edgeData.px.push(x);
        edgeData.py.push(y);
        edgeData.colors.push(color);
      }
    }

    generate(this.generatorData);

    const {
      bucket: { elements, indices },
    } = this.generatorData;

    const { gl } = this.renderContext;

    this.elementBuffer = new Buffer(elements.buffer);
    this.elementBuffer.drawType = Buffer.DynamicDraw;
    this.elementBuffer.prepare(gl);

    this.indexBuffer = new Buffer(indices.buffer);
    this.indexBuffer.type = Buffer.ElementArrayBuffer;
    this.indexBuffer.drawType = Buffer.StaticDraw;
    this.indexBuffer.prepare(gl);

    this.vao = createRoadVao(this.elementBuffer, this.program);
  }

  public updateColors() {
    if (!this.elementBuffer) {
      return;
    }

    for (const edgeData of this.generatorData.edges) {
      const color = getColor(edgeData.edge.userData.pollution);
      for (let j = 0; j < edgeData.edge.geometry.length; j++) {
        vec4copy(edgeData.colors[j], color);
      }
    }

    generate(this.generatorData);

    this.elementBuffer.subData(this.renderContext.gl, 0, this.generatorData.bucket.elements.buffer);
  }

  public render(cameraMatrix: number[], _mapSize: number[], mapZoom: number) {
    if (!this.vao || !this.indexBuffer) {
      return;
    }

    const { gl } = this.renderContext;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    mat4mul(tempMatrix as any, cameraMatrix, this.matrix);

    const tileZoomLevel = 32 - Math.log(this.size) / Math.LN2;
    const tileSizePx = 256 * Math.pow(2, mapZoom - tileZoomLevel) * window.devicePixelRatio;

    this.program.enable(gl).bind(gl, {
      u_mat4_mvp: tempMatrix,
      u_float_width: 4 * window.devicePixelRatio,
      u_float_tile_to_pixel_ratio: 1 / tileSizePx,
    });

    this.vao.bind(this.renderContext);

    this.indexBuffer.bind(gl);

    if (this.generatorData.indexLength > 0) {
      gl.drawElements(gl.TRIANGLES, this.generatorData.indexLength, gl.UNSIGNED_INT, 0);
    }
  }
}
