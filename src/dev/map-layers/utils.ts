import { LinkButton } from "~/map-interface/components/buttons";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import { h, buildMapStyle } from "./index";

export function ParentRouteButton({ icon = "arrow-left", ...rest }) {
  // A button that links to the parent route
  return h(LinkButton, { to: "..", icon, minimal: true, ...rest });
}

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
