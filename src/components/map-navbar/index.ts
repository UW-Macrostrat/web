import { LinkButton } from "#/map/map-interface/components/buttons";
import { AnchorButton } from "@blueprintjs/core";
import { FloatingNavbar, MapLoadingButton } from "@macrostrat/map-interface";
import { useMapStatus } from "@macrostrat/mapbox-react";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useInRouterContext } from "react-router";

const h = hyperStyled(styles);

export function ParentRouteButton({
  parentRoute,
  icon = "arrow-left",
  ...rest
}) {
  // Check if we are in a react-router context
  const inRouterContext = useInRouterContext();

  let _parentRoute = parentRoute;
  if (parentRoute == null) {
    // Check if the current route ends with a slash
    const path = window.location.pathname;
    if (path.endsWith("/")) {
      _parentRoute = "..";
    } else {
      _parentRoute = ".";
    }
  }

  if (inRouterContext) {
    // Should check whether we are the "root" route
    return h(LinkButton, { to: "..", icon, minimal: true, ...rest });
  }

  // A button that links to the parent route. This may not be responsive to all needs.
  return h(AnchorButton, { href: _parentRoute, icon, minimal: true });
}

export function MapNavbar({
  title,
  isOpen,
  setOpen,
  parentRoute,
  minimal = false,
  large = false,
}) {
  if (minimal) {
    return MapMinimalNavbar({ isOpen, setOpen });
  }
  const { isLoading } = useMapStatus();
  return h(FloatingNavbar, { className: "searchbar map-navbar" }, [
    h([h(ParentRouteButton, { parentRoute }), h("h2.map-title", title)]),
    h("div.spacer"),
    h(MapLoadingButton, {
      active: isOpen,
      onClick: () => setOpen(!isOpen),
      isLoading,
      large,
    }),
  ]);
}

function MapMinimalNavbar({ isOpen, setOpen, large = false }) {
  const { isLoading } = useMapStatus();
  return h("div.map-minimal-navbar map-navbar", [
    h(FloatingNavbar, { className: "searchbar" }, [
      h(MapLoadingButton, {
        active: isOpen,
        onClick: () => setOpen(!isOpen),
        isLoading,
        large,
      }),
    ]),
  ]);
}
