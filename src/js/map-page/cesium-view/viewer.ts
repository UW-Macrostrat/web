import { useEffect, useRef, ComponentProps } from "react";
import h from '@macrostrat/hyper'
import { Viewer, CesiumComponentRef } from "resium";
import NavigationMixin from "@znemz/cesium-navigation"
import "@znemz/cesium-navigation/dist/index.css"

type GlobeViewerProps = ComponentProps<typeof Viewer> & {
  highResolution: boolean
}

const GlobeViewer = (props: GlobeViewerProps) => {
  const ref = useRef<CesiumComponentRef<Cesium.Viewer>>(null);
  const {highResolution, ...rest} = props

  useEffect(() => {
    const {cesiumElement} = ref.current ?? {}
    if (cesiumElement == null) return
    let ratio = 1
    if (highResolution) {
      ratio = Math.min(window.devicePixelRatio ?? 1, 2)
    }
    ref.current.cesiumElement.resolutionScale = ratio
  }, [highResolution]);

  useEffect(() => {
    const {cesiumElement} = ref.current ?? {}
    if (cesiumElement == null) return
    ref.current.cesiumElement.extend(NavigationMixin, {})
  }, []);

  return h(Viewer, {
    ref,
    full: true,
    baseLayerPicker : false,
    fullscreenButton: false,
    homeButton: false,
    infoBox: false,
    navigationInstructionsInitiallyVisible: false,
    navigationHelpButton: false,
    scene3DOnly: true,
    vrButton: false,
    geocoder: false,
    //skyAtmosphere: true,
    animation: false,
    timeline: false,
    //imageryProvider: false,
    //shadows: true,
    ...rest
  })
};

export {GlobeViewer}
