import { useRef} from 'react'
import {
  MapboxImageryProvider,
  Rectangle,
  Cartographic
} from "cesium"
import h from '@macrostrat/hyper'
import {ImageryLayer} from "resium"
import {useSelector} from 'react-redux'
import REGL from 'regl'
import {vec3} from 'gl-matrix'
// https://wwwtyro.net/2019/03/21/advanced-map-shading.html

type Img = HTMLImageElement|HTMLCanvasElement

class HillshadeImageryProvider extends MapboxImageryProvider {
  processImage(image: Img, rect: Cesium.Rectangle): Img {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const regl = REGL({ canvas, extensions: ["OES_texture_float"]});

    const tElevation = regl.texture({
      data: image,
      flipY: true
    });

    const angle = rect.east-rect.west
    // rough meters per pixel (could get directly from zoom level)
    const pixelScale = 6371000*angle/image.width

    const cmdProcessElevation = regl({
      vert: `
        precision highp float;
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
      frag: `
        precision highp float;

        uniform sampler2D tElevation;
        uniform vec2 resolution;
        uniform float elevationScale;

        void main() {
          // Sample the terrain-rgb tile at the current fragment location.
          vec3 rgb = texture2D(tElevation, gl_FragCoord.xy/resolution).rgb;

          // Convert the red, green, and blue channels into an elevation.
          float e = -10000.0 + ((rgb.r * 255.0 * 256.0 * 256.0 + rgb.g * 255.0 * 256.0 + rgb.b * 255.0) * 0.1);

          // Scale the elevation and write it out.
          gl_FragColor = vec4(vec3(e * elevationScale), 1.0);
        }
      `,
      attributes: {
        position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
      },
      uniforms: {
        tElevation: tElevation,
        elevationScale: 0.0005,
        resolution: [image.width, image.height]
      },
      viewport: { x: 0, y: 0, width: image.width, height: image.height },
      count: 6
    });

    const fboElevation = regl.framebuffer({
      width: image.width,
      height: image.height,
      colorType: "float"
    });

    cmdProcessElevation()

    const cmdNormal = regl({
      vert: `
        precision highp float;
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
      frag: `
        precision highp float;

        uniform sampler2D tElevation;
        uniform vec2 resolution;
        uniform float pixelScale;

        void main() {
          vec2 dr = 1.0/resolution;
          float p0 = texture2D(tElevation, dr * (gl_FragCoord.xy + vec2(0.0, 0.0))).r;
          float px = texture2D(tElevation, dr * (gl_FragCoord.xy + vec2(1.0, 0.0))).r;
          float py = texture2D(tElevation, dr * (gl_FragCoord.xy + vec2(0.0, 1.0))).r;
          vec3 dx = vec3(pixelScale, 0.0, px - p0);
          vec3 dy = vec3(0.0, pixelScale, py - p0);
          vec3 n = normalize(cross(dx, dy));
          gl_FragColor = vec4(0.5 * n + 0.5, 1.0);
        }
      `,
      attributes: {
        position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
      },
      uniforms: {
        tElevation: fboElevation,
        pixelScale: pixelScale,
        resolution: [image.width, image.height]
      },
      viewport: { x: 0, y: 0, width: image.width, height: image.height },
      count: 6
    });

    const fboNormal = regl.framebuffer({
      width: image.width,
      height: image.height,
      colorType: "float"
    });

    cmdNormal();

    const cmdDirect = regl({
      vert: `
        precision highp float;
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
      frag: `
        precision highp float;

        uniform sampler2D tNormal;
        uniform vec2 resolution;
        uniform vec3 sunDirection;

        void main() {
          vec2 dr = 1.0/resolution;
          vec3 n = texture2D(tNormal, gl_FragCoord.xy/resolution).rgb;
          float l = dot(n, sunDirection);
          l = 0.5 * l + 0.5;
          gl_FragColor = vec4(l, l, l, 1.0);
        }
      `,
      attributes: {
        position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
      },
      uniforms: {
        tNormal: fboNormal,
        resolution: [image.width, image.height],
        sunDirection: vec3.normalize([], [1, 1, 1])
      },
      viewport: { x: 0, y: 0, width: image.width, height: image.height },
      count: 6
    });

    cmdDirect();

    return canvas
  }
  requestImage(x,y,z,request) {
    const res = super.requestImage(x,y,z,request)
    const rect = this.tilingScheme.tileXYToRectangle(x, y, z)
    return res?.then(d=>this.processImage(d, rect))
  }
}

const HillshadeLayer = (props)=>{
  const hasSatellite = useSelector(state => state.update.mapHasSatellite)

  let format = '.webp'
  if (window.devicePixelRatio >= 2) format = '@2x.webp'

  let hillshade = useRef(new HillshadeImageryProvider({
    mapId : 'mapbox.terrain-rgb',
    maximumLevel : 14,
    format,
    accessToken: process.env.MAPBOX_API_TOKEN
  }))

  if (hasSatellite) return null
  return h(ImageryLayer, {imageryProvider: hillshade.current, ...props})
}


export {HillshadeLayer}
