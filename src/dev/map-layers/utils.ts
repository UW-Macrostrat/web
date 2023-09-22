import { LinkButton } from "~/map-interface/components/buttons";
import { AnchorButton } from "@blueprintjs/core";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import { h, buildMapStyle } from "./index";
import { FloatingNavbar, MapLoadingButton } from "@macrostrat/map-interface";
import { useMapStatus } from "@macrostrat/mapbox-react";

export function ParentRouteButton({
  parentRoute,
  icon = "arrow-left",
  ...rest
}) {
  // A button that links to the parent route
  if (parentRoute != null) {
    return h(AnchorButton, { href: parentRoute, icon, minimal: true });
  }

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

export function MapNavbar({ title, isOpen, setOpen, parentRoute }) {
  const { isLoading } = useMapStatus();
  return h(FloatingNavbar, { className: "searchbar" }, [
    h([h(ParentRouteButton, { parentRoute }), h("h2", title)]),
    h("div.spacer"),
    h(MapLoadingButton, {
      active: isOpen,
      onClick: () => setOpen(!isOpen),
      isLoading,
    }),
  ]);
}
