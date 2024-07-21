import { FormGroup, Label, Slider, Spinner } from "@blueprintjs/core";
import { getBaseMapStyle } from "@macrostrat-web/map-utils";
import {
  FloatingNavbar,
  MapAreaContainer,
  MapLoadingButton,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { useMapRef } from "@macrostrat/mapbox-react";
import { useDarkMode } from "@macrostrat/ui-components";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";
import { MacrostratRasterTileset, buildRasterStyle, h } from ".";
import { useMapStyle } from "./utils";

export function RasterOpacityManager({ layerID, opacity }) {
  const mapRef = useMapRef();
  useEffect(() => {
    if (mapRef.current == null) return;
    const map = mapRef.current;
    const layer = map.getLayer(layerID);
    if (layer == null) return;
    map.setPaintProperty(layerID, "raster-opacity", opacity);
  }, [mapRef, opacity, layerID]);
  return null;
}

export function RasterMapInspectorPage({
  tileset,
}: {
  tileset: MacrostratRasterTileset;
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  // This appears necessary to get the position to set successfully
  const runAction = useAppActions();
  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const [isOpen, setOpen] = useState(false);

  const isLoading = useAppState((state) => state.core.mapIsLoading);

  let detailElement = null;

  const { isEnabled } = useDarkMode();
  const baseMapURL = getBaseMapStyle(false, isEnabled);

  const rasterStyle = useMemo(() => {
    return buildRasterStyle(tileset);
  }, [tileset]);

  const style = useMapStyle(baseMapURL, rasterStyle);
  const [opacity, setOpacity] = useState(0.5);

  if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { className: "searchbar" }, [
        h([h(ParentRouteButton), h("h2", `${tileset}`)]),
        h("div.spacer"),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          isLoading,
        }),
      ]),
      contextPanel: h(PanelCard, [
        h(FormGroup, { className: "opacity-slider" }, [
          h(Label, "Opacity"),
          h(Slider, {
            min: 0,
            max: 1,
            stepSize: 0.01,
            value: opacity,
            onChange(v) {
              setOpacity(v);
            },
          }),
        ]),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style,
      },
      [h(RasterOpacityManager, { layerID: "burwell", opacity })]
    )
  );
}
