import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import { buildMapStyle, h } from "./index";
import { ParentRouteButton } from "~/components/map-navbar";
import { Text } from "@blueprintjs/core";

export function useMapStyle(
  baseMapURL: string,
  overlayStyle: mapboxgl.Style
): mapboxgl.Style | null {
  const [style, setStyle] = useState(null);
  useEffect(() => {
    buildMapStyle(baseMapURL, overlayStyle).then(setStyle);
  }, [baseMapURL, overlayStyle]);
  return style;
}

export function DevPageHeader({ headerElement, title }) {
  return h([
    h(ParentRouteButton),
    headerElement ?? h(Text, { tagName: "h2", ellipsize: true }, title),
  ]);
}
