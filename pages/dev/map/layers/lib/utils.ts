import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import { buildMapStyle } from "./index";

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
