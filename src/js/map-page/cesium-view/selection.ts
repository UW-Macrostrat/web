import {useSelector, useDispatch } from 'react-redux'
import * as Cesium from "cesiumSource/Cesium"
import h from '@macrostrat/hyper'
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
  useCesium,
  Entity
} from "resium"
import {
  queryMap
} from '../../actions'

Cesium.Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;


const MapClickHandler = ()=>{
  const dispatchAction = useDispatch()
  const {viewer} = useCesium()

  const clickPoint = (movement)=>{
    const ray = viewer.camera.getPickRay(movement.position)
    var cartesian = viewer.scene.globe.pick(ray, viewer.scene)
    //var cartesian = viewer.scene.pickPosition(movement.position);

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
    // need to also get height
  )
  let pointGraphics  = {
    color : Cesium.Color.DODGERBLUE,
    outlineColor : Cesium.Color.WHITE,
    outlineWidth : 2,
    pixelSize: 10
  }

  return h(Entity, {position, point: pointGraphics})
}

export {MapClickHandler, SelectedPoint}
