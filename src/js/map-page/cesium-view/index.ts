import "cesiumSource/Widgets/widgets.css"
import * as Cesium from "cesiumSource/Cesium"
import {hyperStyled} from '@macrostrat/hyper'
import styles from "./main.styl"
const h = hyperStyled(styles)
import {GlobeViewer} from './viewer'
import {GeologyLayer, SatelliteLayer} from './layers'
import {MapClickHandler, SelectedPoint, MapChangeTracker, FlyToInitialPosition} from './position'
import {Fog, Globe, Scene} from 'resium'
import {useSelector} from 'react-redux'
import MapboxTerrainProvider from '@macrostrat/cesium-martini'

const terrainProvider = new MapboxTerrainProvider({
    // @ts-ignore
    accessToken: process.env.MAPBOX_API_TOKEN,
    format: 'webp',
    highResolution: false
});

const CesiumView = (props)=>{

  const exaggeration = useSelector(state => state.globe.verticalExaggeration) ?? 1


  return h(GlobeViewer, {
    terrainProvider,
    // not sure why we have to do this...
    terrainExaggeration: exaggeration + .00001,
    highResolution: true,
    skyBox: false
    //terrainShadows: Cesium.ShadowMode.ENABLED
  }, [
    h(Globe, {
      baseColor: Cesium.Color.LIGHTGRAY,
      enableLighting: false,
      showGroundAtmosphere: true,
      maximumScreenSpaceError: 1.5 //defaults to 2
      //shadowMode: Cesium.ShadowMode.ENABLED
    }, null),
    h(Scene),
    h(MapChangeTracker),
    h(SatelliteLayer),
    h(GeologyLayer, {alpha: 0.5}),
    h(MapClickHandler),
    h(SelectedPoint),
    h(FlyToInitialPosition),
    h(Fog, {density: 1e-4})
  ])
}

export default CesiumView;
