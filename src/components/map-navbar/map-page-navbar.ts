/** Shared navbar for full-screen map pages.
 *
 * Deliberately **not** re-exported from the `~/components` barrel, and it must
 * not be: importing `@macrostrat/map-interface` from the barrel drags
 * `@macrostrat/mapbox-react` -> `mapbox-gl-controls` into the graph of every
 * module that imports `~/components`, and that package is ESM with no
 * `"type": "module"`. During SSR that turns into a hard
 * "Cannot require() ES Module ... in a cycle" 500. Import this file by path
 * instead — which is why the other map-navbar components here are outside the
 * barrel too.
 */

import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { FloatingNavbar, MapLoadingButton } from "@macrostrat/map-interface";
import {
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
} from "../navigation/breadcrumbs";
import styles from "./map-page-navbar.module.sass";

const h = hyper.styled(styles);

interface MapPageNavbarProps {
  /** Whether the context panel is open, for the toggle's active state. */
  isOpen: boolean;
  onToggle: () => void;
  /** Matched to the context panel below it, so the two read as one column. */
  width?: number;
  className?: string;
  /** Extra controls, placed after the title and before the panel toggle. */
  children?: React.ReactNode;
}

/**
 * The navbar for a full-screen map page: a collapsing breadcrumb trail with the
 * Macrostrat logo on top, the page title below it, and the context-panel toggle
 * on the right.
 *
 * Breadcrumbs and title both come from the page's own `+pageInfo`, so a page
 * gets branding and a way back out without naming either — which is the point of
 * sharing this rather than each map page assembling its own header.
 */
export function MapPageNavbar({
  isOpen,
  onToggle,
  width = 320,
  className,
  children,
}: MapPageNavbarProps) {
  // Drop the leaf (the current page) from the trail; it's shown as the title.
  const trail = usePageBreadcrumbs(); //.slice(0, -1);

  return h(
    FloatingNavbar,
    { className: classNames(styles["map-page-navbar"], className), width },
    [
      h("div.navbar-title-stack", [
        h(PageBreadcrumbsInternal, {
          items: trail,
          showLogo: true,
          separateTitle: true,
        }),
      ]),
      children,
      h(
        "div.loading-button",
        h(MapLoadingButton, { active: isOpen, onClick: onToggle, large: true })
      ),
    ]
  );
}
