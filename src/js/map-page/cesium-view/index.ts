//https://resium.darwineducation.com/examples/?path=/story/fog--basic

import { useRef, useEffect, ComponentProps} from 'react'
import "cesiumSource/Widgets/widgets.css"
import * as Cesium from "cesiumSource/Cesium"
import {hyperStyled} from '@macrostrat/hyper'
import styles from "./main.styl"
const h = hyperStyled(styles)
import {useSelector, useDispatch } from 'react-redux'
import {GlobeViewer} from './viewer'
import {
  ImageryLayer,
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
  Entity,
  useCesium
} from "resium"
import {
  queryMap
} from '../../actions'

Cesium.Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;

const terrainProvider = Cesium.createWorldTerrain();

const MapClickHandler = ()=>{
  const dispatchAction = useDispatch()
  const {viewer} = useCesium()

  const clickPoint = (movement)=>{
    var cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);

    var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    //console.log(longitude, latitude);
    //addPoint(longitude, latitude)
    dispatchAction(queryMap(longitude, latitude, 7, null))
  }

  return h(ScreenSpaceEventHandler, [
    h(ScreenSpaceEvent, {
      action: clickPoint,
      type: Cesium.ScreenSpaceEventType.LEFT_CLICK
    })
  ])
}

type GeoLayerProps = Omit<ComponentProps<typeof ImageryLayer>,"imageryProvider">

const GeologyLayer = (props: GeoLayerProps)=>{
  let geology = useRef(new Cesium.WebMapTileServiceImageryProvider({
    url : 'https://macrostrat.org/api/v2/maps/burwell/emphasized/{TileMatrix}/{TileCol}/{TileRow}/tile.png',
    style : 'default',
    format : 'image/png',
    maximumLevel : 19,
    layer: "",
    tileMatrixSetID: "",
    credit : new Cesium.Credit('UW-Madison, Macrostrat Lab'),
  }))

  return h(ImageryLayer, {imageryProvider: geology.current, ...props})
}

const SelectedPoint = (props)=>{
  const mapOpts = useSelector(s => s.update)
  const {
    infoMarkerLng,
    infoMarkerLat,
  } = mapOpts
  // TODO: fix weird null signifier
  if (infoMarkerLng == -999 || infoMarkerLat == -999) return null

  let position = Cesium.Cartesian3.fromDegrees(
    // TODO: Numbers should be guaranteed in typescript
    parseFloat(infoMarkerLng),
    parseFloat(infoMarkerLat)
  )
  let pointGraphics  = {
    color : Cesium.Color.DODGERBLUE,
    outlineColor : Cesium.Color.WHITE,
    outlineWidth : 2,
    pixelSize: 10
  }

  return h(Entity, {position, point: pointGraphics})
}

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
