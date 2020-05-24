import { useRef} from 'react'
import {
  MapboxImageryProvider
} from "cesium"
import h from '@macrostrat/hyper'
import {ImageryLayer} from "resium"
import {useSelector} from 'react-redux'

class HillshadeImageryProvider extends MapboxImageryProvider {
  requestImage(x,y,z,request) {
    console.log(x,y,z)
    return super.requestImage(x,y,z,request)
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
