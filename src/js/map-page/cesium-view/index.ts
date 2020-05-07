import "cesiumSource/Widgets/widgets.css"
import * as Cesium from "cesiumSource/Cesium"
import {hyperStyled} from '@macrostrat/hyper'
import styles from "./main.styl"
const h = hyperStyled(styles)
import {GlobeViewer} from './viewer'
import {GeologyLayer} from './geology-layer'
import {MapClickHandler, SelectedPoint} from './selection'

Cesium.Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;

const terrainProvider = Cesium.createWorldTerrain();

const CesiumView = (props)=>{
  return h(GlobeViewer, {
    terrainProvider,
    highResolution: true
  }, [
    h(GeologyLayer, {alpha: 0.5}),
    h(MapClickHandler),
    h(SelectedPoint)
    //h(Entity, {position, point: pointGraphics})
  ])
}

export default CesiumView;
