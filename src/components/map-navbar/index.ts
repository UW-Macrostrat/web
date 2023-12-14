import { LinkButton } from "~/pages/map/map-interface/components/buttons";
import { AnchorButton } from "@blueprintjs/core";
import { FloatingNavbar, MapLoadingButton } from "@macrostrat/map-interface";
import { useMapStatus } from "@macrostrat/mapbox-react";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyperStyled(styles);

export function ParentRouteButton({
  parentRoute,
  icon = "arrow-left",
  ...rest
}) {
  // A button that links to the parent route. This may not be responsive to all needs.
  if (parentRoute != null) {
    return h(AnchorButton, { href: parentRoute, icon, minimal: true });
  }

  return h(LinkButton, { to: "..", icon, minimal: true, ...rest });
}

export function MapNavbar({
  title,
  isOpen,
  setOpen,
  parentRoute,
  minimal = false,
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
    }),
  ]);
}

function MapMinimalNavbar({ isOpen, setOpen }) {
  const { isLoading } = useMapStatus();
  return h("div.map-minimal-navbar map-navbar", [
    h(FloatingNavbar, { className: "searchbar" }, [
      h(MapLoadingButton, {
        active: isOpen,
        onClick: () => setOpen(!isOpen),
        isLoading,
      }),
    ]),
    h("div.spacer"),
  ]);
}
