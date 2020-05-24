import { useRef} from 'react'
import {
  MapboxImageryProvider
} from "cesium"
import h from '@macrostrat/hyper'
import {ImageryLayer} from "resium"
import {useSelector} from 'react-redux'
import {get} from 'axios'

class HillshadeImageryProvider extends MapboxImageryProvider {
  processImage(img: HTMLImageElement|HTMLCanvasElement) {
    return img
  }
  requestImage(x,y,z,request) {
    const res = super.requestImage(x,y,z,request)
    return res?.then(this.processImage)
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
