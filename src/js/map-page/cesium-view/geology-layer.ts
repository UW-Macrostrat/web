import { useRef, ComponentProps} from 'react'
import {Credit, WebMapTileServiceImageryProvider} from "cesium"
import h from '@macrostrat/hyper'
import {ImageryLayer} from "resium"
import {useSelector} from 'react-redux'

type GeoLayerProps = Omit<ComponentProps<typeof ImageryLayer>,"imageryProvider">

const GeologyLayer = (props: GeoLayerProps)=>{

  const hasGeology = useSelector(state => state.update.mapHasBedrock)

  let geology = useRef(new WebMapTileServiceImageryProvider({
    url : 'https://macrostrat.org/api/v2/maps/burwell/emphasized/{TileMatrix}/{TileCol}/{TileRow}/tile.png',
    style : 'default',
    format : 'image/png',
    maximumLevel : 19,
    layer: "",
    tileMatrixSetID: "",
    credit : new Credit('UW-Madison, Macrostrat Lab'),
  }))

  if (!hasGeology) return null

  return h(ImageryLayer, {imageryProvider: geology.current, ...props})
}

export {GeologyLayer}
