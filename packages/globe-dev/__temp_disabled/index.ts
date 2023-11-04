import { Suspense, useEffect, useRef } from "react";
// Import other components
import h from "@macrostrat/hyper";
import { Spinner, Switch } from "@blueprintjs/core";
import loadable from "@loadable/component";
import { useTransition } from "transition-hook";
import classNames from "classnames";
import { PanelCard } from "~/map-page/menu";
import { useState } from "react";
import { LinkButton } from "~/components/buttons";
import {
  FloatingNavbar,
  LoadingButton,
  LocationPanel,
  MapStyledContainer,
} from "@macrostrat/map-interface";

const CesiumViewMod = loadable(() => import("./cesium-view"));
export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

export default function GlobePage() {
  // A stripped-down page for map development
  //const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const [isOpen, setOpen] = useState(false);
  const [showLineSymbols, setShowLineSymbols] = useState(false);
  const isLoading = false; //useAppState((state) => state.core.mapIsLoading);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const isDetailPanelOpen = inspectPosition !== null;
  const detailPanelTrans = useTransition(isDetailPanelOpen, 800);

  const [data, setData] = useState(null);

  const loaded = true; //useSelector((state) => state.core.initialLoadComplete);
  // useEffect(() => {
  //   runAction({ type: "get-initial-map-state" });
  // }, []);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const className = classNames(
    {
      "detail-panel-open": isDetailPanelOpen,
    },
    //`context-panel-${contextPanelTrans.stage}`,
    `detail-panel-${detailPanelTrans.stage}`
  );

  const [showWireframe, setShowWireframe] = useState(false);

  let detailElement = null;
  if (inspectPosition != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setInspectPosition(null);
        },
        position: inspectPosition,
      },
      h(Features, { features: data })
    );
  }

  if (!loaded) {
    return h(Spinner);
  }

  return h(MapStyledContainer, { className: "map-page" }, [
    h("div.main-ui", [
      h("div.context-stack", [
        h(FloatingNavbar, { className: "searchbar" }, [
          h("h2", "Globe"),
          h("div.spacer"),
          h(LoadingButton, {
            active: isOpen,
            onClick: () => setOpen(!isOpen),
            isLoading,
          }),
        ]),
        h.if(isOpen)(PanelCard, [
          h(LinkButton, { to: "/" }, "Go to map"),
          h(Switch, {
            onChange: () => setShowWireframe(!showWireframe),
            checked: showWireframe,
            label: "Wireframe",
          }),
        ]),
      ]),
      //h(MapView),
      h(CesiumView, { showWireframe }),
    ]),
  ]);
}
