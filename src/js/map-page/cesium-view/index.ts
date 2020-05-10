import "cesiumSource/Widgets/widgets.css"
import * as Cesium from "cesiumSource/Cesium"
import {hyperStyled} from '@macrostrat/hyper'
import styles from "./main.styl"
const h = hyperStyled(styles)
import {GlobeViewer} from './viewer'
import {GeologyLayer, SatelliteLayer} from './layers'
import {MapClickHandler, SelectedPoint} from './selection'
import {CameraFlyTo, Fog, Globe, Scene} from 'resium'
import {useSelector} from 'react-redux'

Cesium.Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;

const terrainProvider = Cesium.createWorldTerrain({requestVertexNormals: true});

const FlyToInitialPosition = (props)=>{
  const mapOpts = useSelector(s => s.update)
  const mpos = mapOpts?.mapXYZ
  if (mpos == null) return null

  // Make sure we deactivate this once initial position is reached
  //const currentPos = useState(null)


  const rangeAtZoom18 = 200
  const zoom = parseFloat(mpos.z)
  const zfac = 18-zoom
  const mscale = rangeAtZoom18*Math.pow(2,zfac)

  const destination = new Cesium.Cartesian3.fromDegrees(
    parseFloat(mpos.x), parseFloat(mpos.y), mscale
  )

  return h(CameraFlyTo, {destination, duration: 0, once: true})
}

const CesiumView = (props)=>{

  const direction = Cesium.Cartesian3.fromDegrees(
    0,
    -100,
    80000
  )

  //const light = Cesium.DirectionalLight({direction, intensity: 1})

  return h(GlobeViewer, {
    terrainProvider,
    highResolution: true,
    //terrainShadows: Cesium.ShadowMode.ENABLED
  }, [
    h(Globe, {
      baseColor: Cesium.Color.LIGHTGRAY,
      enableLighting: false,
      dynamicAtmosphereLighting: false,
      //shadowMode: Cesium.ShadowMode.ENABLED
    }),
    h(Scene),
    h(SatelliteLayer),
    h(GeologyLayer, {alpha: 0.5}),
    h(MapClickHandler),
    h(SelectedPoint),
    h(FlyToInitialPosition),
    h(Fog, {density: 1.5e-4})
  ])
}

export default CesiumView;
