// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {Layer, assembleShaders} from '../../..';
import {GL, Model, Geometry} from 'luma.gl';
import {readFileSync} from 'fs';
import {join} from 'path';

const DEFAULT_COLOR = [253, 128, 93, 255];

const defaultGetSourcePosition = x => x.sourcePosition;
const defaultGetTargetPosition = x => x.targetPosition;
const defaultGetColor = x => x.color;

export default class FlightLayer extends Layer {

  static layerName = 'FlightLayer';

  /**
   * @classdesc
   * ArcLayer
   *
   * @class
   * @param {object} props
   */
  constructor({
    strokeWidth = 1,
    getSourcePosition = defaultGetSourcePosition,
    getTargetPosition = defaultGetTargetPosition,
    getSourceColor = defaultGetColor,
    getTargetColor = defaultGetColor,
    ...props
  } = {}) {
    super({
      strokeWidth,
      getSourcePosition,
      getTargetPosition,
      getSourceColor,
      getTargetColor,
      ...props
    });
  }

  updateState({props, changeFlags: {dataChanged}}) {
     if (dataChanged) {
       this.state.attributeManager.invalidateAll();
     }
   }

  initializeState() {
    const {gl} = this.context;
    this.setState({model: this._createModel(gl)});

    const {attributeManager} = this.state;
    attributeManager.addInstanced({
      instanceSourcePositions: {size: 3, update: this.calculateInstanceSourcePositions},
      instanceTargetPositions: {size: 3, update: this.calculateInstanceTargetPositions},
      instanceSourceColors: {
        type: GL.UNSIGNED_BYTE,
        size: 4,
        update: this.calculateInstanceSourceColors
      },
      instanceTargetColors: {
        type: GL.UNSIGNED_BYTE,
        size: 4,
        update: this.calculateInstanceTargetColors
      }
    });
  }

  draw({uniforms}) {
    const {gl} = this.context;
    const {trailLength, currentTime, timestamp} = this.props;
    const lineWidth = this.screenToDevicePixels(this.props.strokeWidth);
    gl.lineWidth(lineWidth);
    console.log(currentTime);
    this.state.model.render(Object.assign({}, uniforms, {
      trailLength,
      currentTime,
      timestamp
    }));
    // Setting line width back to 1 is here to workaround a Google Chrome bug
    // gl.clear() and gl.isEnabled() will return GL_INVALID_VALUE even with
    // correct parameter
    // This is not happening on Safari and Firefox
    gl.lineWidth(1.0);
  }

  getShaders() {
    return {
      vs: readFileSync(join(__dirname, './flight-layer-vertex.glsl'), 'utf8'),
      fs: readFileSync(join(__dirname, './flight-layer-fragment.glsl'), 'utf8')
    };
  }

  _createModel(gl) {
    let positions = [];
    const NUM_SEGMENTS = 50;
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      positions = [...positions, i, i, i];
    }

    return new Model({
      gl,
      ...assembleShaders(gl, this.getShaders()),
      geometry: new Geometry({
        drawMode: GL.LINE_STRIP,
        positions: new Float32Array(positions)
      }),
      isInstanced: true
    });
  }

  calculateInstancePositions(attribute) {
    const {data, getSourcePosition, getTargetPosition} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition(object);
      const targetPosition = getTargetPosition(object);
      value[i + 0] = sourcePosition[0];
      value[i + 1] = sourcePosition[1];
      value[i + 2] = targetPosition[0];
      value[i + 3] = targetPosition[1];
      i += size;
    }
  }

  calculateInstanceSourcePositions(attribute) {
    const {data, getSourcePosition, getTargetPosition} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition(object);
      value[i + 0] = sourcePosition[0];
      value[i + 1] = sourcePosition[1];
      value[i + 2] = 0;
      i += size;
    }
  }

  calculateInstanceTargetPositions(attribute) {
    const {data, getSourcePosition, getTargetPosition} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const targetPosition = getTargetPosition(object);
      value[i + 0] = targetPosition[0];
      value[i + 1] = targetPosition[1];
      value[i + 2] = 0;
      i += size;
    }
  }

  calculateInstanceSourceColors(attribute) {
    const {data, getSourceColor} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const color = getSourceColor(object) || DEFAULT_COLOR;
      value[i + 0] = color[0];
      value[i + 1] = color[1];
      value[i + 2] = color[2];
      value[i + 3] = isNaN(color[3]) ? DEFAULT_COLOR[3] : color[3];
      i += size;
    }
  }

  calculateInstanceTargetColors(attribute) {
    const {data, getTargetColor} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const color = getTargetColor(object) || DEFAULT_COLOR;
      value[i + 0] = color[0];
      value[i + 1] = color[1];
      value[i + 2] = color[2];
      value[i + 3] = isNaN(color[3]) ? DEFAULT_COLOR[3] : color[3];
      i += size;
    }
  }
}
