/** The map-dominant endmember: `MapAreaContainer` from
 * `@macrostrat/map-interface`, with the hybrid slots mapped onto its panels.
 *
 *   navbar       ← breadcrumbs + layout controls (its `FloatingNavbar`)
 *   contextPanel ← content (the list and its filter toolbar)
 *   detailPanel  ← assistant
 *   children     ← map
 *
 * `map-only` is this with the context panel closed, which the container already
 * animates — so the two map-dominant modes need no layout of their own.
 *
 * Client-only (`.client.ts`, loaded via `onDemand`): nothing in
 * `map-interface` is SSR-safe — every consumer in the app is `server: false` —
 * and importing it at module scope took the whole page's server render down.
 * Keeping it behind a client-only boundary lets the content shell, which is
 * what SSR renders by default, stay server-rendered.
 */

import classNames from "classnames";
import {
  DetailPanelStyle,
  FloatingNavbar,
  MapAreaContainer,
} from "@macrostrat/map-interface";

import h from "./map-shell.module.sass";

export function MapShell({
  content,
  breadcrumbs,
  controls,
  map,
  assistant,
  mode,
  showAssistant,
}) {
  const contextPanelOpen = mode !== "map-only";

  let contextPanel = null;
  if (contextPanelOpen) {
    contextPanel = h("div.map-context-panel", content);
  }

  let detailPanel = null;
  if (showAssistant) {
    detailPanel = h("div.map-detail-panel", assistant);
  }

  const navbar = h(FloatingNavbar, {
    className: "hybrid-navbar",
    headerElement: breadcrumbs,
    rightElement: h("div.navbar-controls", controls),
  });

  return h(
    MapAreaContainer,
    {
      className: classNames(`mode-${mode}`),
      navbar,
      contextPanel,
      contextPanelOpen,
      // `ContextStack` is a flex column of [navbar, panel holder, spacer], and
      // the holder is content-sized by default — fine for the `PanelCard`s this
      // container was built for, fatal for a data panel that needs a definite
      // height to scroll in. Claiming the stack lets us give the holder one.
      contextStackProps: { className: "hybrid-context-stack" },
      detailPanel,
      detailPanelOpen: showAssistant,
      detailPanelStyle: DetailPanelStyle.FLOATING,
      fitViewport: true,
    },
    map
  );
}
