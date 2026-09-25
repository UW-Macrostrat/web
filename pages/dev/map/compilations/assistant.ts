/** The assistant panel: what the map settings are, and what is defined at the
 * inspected point.
 *
 * The point view reuses the list's own row set — the point-scoped graph goes
 * through exactly the same flattening — so "what maps are here" is answered in
 * the same vocabulary as the catalog rather than a parallel one.
 */

import { Button, Callout, Spinner, Switch, Tag } from "@blueprintjs/core";
import { ExpansionPanel } from "@macrostrat/data-components";
import { ErrorCallout } from "@macrostrat/ui-components";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

import { BaseLayerForm, Link } from "~/components";
import {
  fetchCompilationGraph,
  formatArea,
  mapPageHref,
  NodeTags,
  contentTags,
} from "~/components/compilation-tree";

import {
  basemapAtom,
  expandMembersAtom,
  focusNodeAtom,
  focusSlugAtom,
  pointAtom,
  pointGraphAtom,
  showCartoAtom,
  showFacesAtom,
  showFootprintsAtom,
  showLabelsAtom,
  type Point,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function CompilationAssistant() {
  return h("div.compilation-assistant", [
    h(PointLoader),
    h(FocusSummary),
    h(PointSummary),
    h(MapOptions),
    h(Legend),
  ]);
}

/* ----------------------------------------------------------- the location */

/** Fetches the point-scoped graph when the marker moves, into the atom the list
 * and map both read. Rendered for its effect only — the panel that shows the
 * result is separate, so it survives the panel being collapsed. */
function PointLoader() {
  const point = useAtomValue(pointAtom);
  const setGraph = useSetAtom(pointGraphAtom);
  const [error, setError] = useState<Error | null>(null);

  const lng = point?.lng ?? null;
  const lat = point?.lat ?? null;

  useEffect(() => {
    if (lng == null || lat == null) {
      setGraph(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setGraph(null);
    setError(null);

    fetchCompilationGraph({ lng, lat })
      .then((graph) => {
        if (!cancelled) setGraph(graph);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [lng, lat, setGraph]);

  if (error == null) return null;
  return h(ErrorCallout, { error });
}

function PointSummary() {
  const [point, setPoint] = useAtom(pointAtom);
  const graph = useAtomValue(pointGraphAtom);

  if (point == null) {
    return h(
      Callout,
      { className: "point-summary", icon: "map-marker" },
      "Click the map to narrow the list to the maps covering a point."
    );
  }

  let body = null;
  if (graph == null) {
    body = h(Spinner, { size: 16 });
  } else {
    const compilations = graph.nodes.filter((n) => n.is_compilation).length;
    const maps = graph.nodes.length - compilations;
    body = h(
      "p.point-counts",
      `${maps} maps in ${compilations} compilations cover this point.`
    );
  }

  return h(Callout, { className: "point-summary", icon: "map-marker" }, [
    h("div.point-header", [
      h("code", formatCoordinates(point)),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        title: "Show the whole catalog",
        onClick: () => setPoint(null),
      }),
    ]),
    body,
  ]);
}

function formatCoordinates({ lng, lat }: Point) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lng).toFixed(3)}°${ew}`;
}

/* -------------------------------------------------------------- the focus */

/** What the map is drawing. Any compilation is addressable by the tile routes,
 * so this is a real choice rather than a fixed layer. */
function FocusSummary() {
  const node = useAtomValue(focusNodeAtom);
  const setFocus = useSetAtom(focusSlugAtom);

  if (node == null) {
    return h(
      Callout,
      { className: "focus-summary", icon: "layers" },
      "The map is drawing carto-large. Pick a compilation in the list to draw it instead."
    );
  }

  return h(Callout, { className: "focus-summary", icon: "layers" }, [
    h("div.focus-header", [
      h(
        Link,
        { href: mapPageHref(node), className: "focus-name" },
        node.name ?? node.slug
      ),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        title: "Back to carto-large",
        onClick: () => setFocus(null),
      }),
    ]),
    h(NodeTags, { node }),
    h("p.focus-stats", focusStats(node)),
  ]);
}

/** A leaf map has no members, so saying "0 members" is noise rather than
 * information; only a compilation gets a membership line. */
function focusStats(node) {
  const parts: string[] = [];
  if (node.is_compilation) {
    parts.push(`${node.n_members} members`);
    if (node.n_sources !== node.n_members) {
      parts.push(`${node.n_sources} maps`);
    }
  }
  if (node.is_standalone) {
    parts.push("in no compilation");
  }
  const area = formatArea(node.area_km);
  if (area != null) parts.push(area);
  return parts.join(" · ");
}

/* ------------------------------------------------------------ map options */

function MapOptions() {
  const [footprints, setFootprints] = useAtom(showFootprintsAtom);
  const [faces, setFaces] = useAtom(showFacesAtom);
  const [expand, setExpand] = useAtom(expandMembersAtom);
  const [carto, setCarto] = useAtom(showCartoAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h(
    ExpansionPanel,
    { title: "Map layers", className: "map-options", expanded: true },
    [
      h(Switch, {
        label: "Member footprints",
        checked: footprints,
        onChange: (evt) => setFootprints(evt.currentTarget.checked),
      }),
      h(Switch, {
        label: "Solved faces",
        checked: faces,
        onChange: (evt) => setFaces(evt.currentTarget.checked),
      }),
      h(Switch, {
        label: "Expand to constituent maps",
        checked: expand,
        onChange: (evt) => setExpand(evt.currentTarget.checked),
      }),
      h("p.option-note", [
        "Off, a compilation is drawn as the units it presents — British Columbia once, not its two constituent maps. On, as the maps it resolves to.",
      ]),
      h(Switch, {
        label: "Macrostrat map",
        checked: carto,
        onChange: (evt) => setCarto(evt.currentTarget.checked),
      }),
      h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
    ]
  );
}

function Legend() {
  return h(
    ExpansionPanel,
    { title: "Legend", className: "legend-panel", expanded: false },
    h(
      "dl.legend",
      contentTags.flatMap((tag) => [
        h("dt", { key: `${tag.label}-t` }, tag.label),
        h("dd", { key: `${tag.label}-d` }, tag.title),
      ])
    )
  );
}
