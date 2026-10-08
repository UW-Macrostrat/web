/** "Other maps" — where this map sits among the compilations, then the maps
 * that overlap or lie near it, at this scale or finer.
 *
 * Membership comes first, carto above all: whether the main map draws this
 * map is the first thing a reader of this page wants to know.
 *
 * Coarser maps are left out by default. Every map is covered by the same handful
 * of global and continental sheets, so listing them puts identical answers on
 * every page and buries the ones that mean something; a toggle brings them back
 * as context. What is left is grouped by scale — peers first, then the finer
 * maps that cover only part of this one — and then the maps nearby.
 *
 * Every row links to that map's page and to a diff against this one, both
 * opened at the current view.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";
import {
  AnchorButton,
  Button,
  NonIdealState,
  Spinner,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { ErrorCallout } from "@macrostrat/ui-components";
import { useEffect, useState } from "react";

import { Link } from "~/components";
import { DEFAULT_COMPILATION } from "~/_utils/compilations";
import { diffPath } from "~/_utils/map-diff";
import { hashWithMapPosition } from "~/_utils/map-position";
import h from "./main.module.sass";

interface NeighborMap {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  ref_year: string | null;
  superseded_by: number | null;
  area_km: number | null;
  relation: "overlaps" | "nearby";
  /** Roughly how much of *this* map the neighbour covers, 0–1, from the two
   * bounding boxes. */
  overlap_fraction: number | null;
  /** 0 for a peer at the same scale, 1 for one band finer; negative for a
   * coarser map, which only appears when asked for. */
  scale_distance: number;
  is_compilation: boolean;
  is_mosaic_member: boolean;
  in_carto: boolean;
  in_compilations: string[];
}

interface CompilationRef {
  source_id: number;
  slug: string;
  name: string | null;
}

interface MapMembership {
  in_carto: boolean;
  /** Carto's base layers (`small`, `medium`, `large`) the map is placed in. */
  carto_layers: string[];
  compilations: CompilationRef[];
}

interface NeighborResult {
  source_id: number;
  slug: string;
  include_coarser: boolean;
  membership: MapMembership;
  neighbors: NeighborMap[];
}

/** What the map shows, as on the page: its bounds and zoom. */
interface View {
  bounds: [number, number, number, number];
  zoom: number;
}

function useNeighbors(ident: string | number | null, includeCoarser: boolean) {
  const [state, setState] = useState<{
    data: NeighborResult | null;
    error: Error | null;
    loading: boolean;
  }>({ data: null, error: null, loading: ident != null });

  useEffect(() => {
    if (ident == null) return;
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    let url = `${apiV3Prefix}/compilations/${ident}/neighbors`;
    if (includeCoarser) {
      url += "?include_coarser=true";
    }

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return (await res.json()) as NeighborResult;
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [ident, includeCoarser]);

  return state;
}

/** ~1 m, past the resolution of any Macrostrat dataset. */
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/** The current view as a position hash, so links open where the reader is. */
function viewHash(view: View | null): string {
  if (view == null) return "";
  const [west, south, east, north] = view.bounds;
  const lng = roundCoord((west + east) / 2);
  const lat = roundCoord((south + north) / 2);
  const hash = hashWithMapPosition("", {
    camera: { lng, lat, bearing: 0, pitch: 0 },
    target: { lng, lat, zoom: Math.round(view.zoom * 10) / 10 },
  });
  return `#${hash}`;
}

/** Carto is the main map; every other map has its own page. */
function mapHref(slug: string, hash: string): string {
  if (slug == DEFAULT_COMPILATION) return `/map${hash}`;
  return `/maps/${slug}${hash}`;
}

export function NeighborMaps({ mapInfo, view }) {
  // The panel is only mounted when its tab is open, so the request is made on
  // demand rather than on every map page load.
  const ident = mapInfo?.slug ?? mapInfo?.source_id ?? null;
  const [includeCoarser, setIncludeCoarser] = useState(false);
  const { data, error, loading } = useNeighbors(ident, includeCoarser);
  const hash = viewHash(view);

  const coarserSwitch = h(Switch, {
    className: "neighbor-coarser",
    label: "Include coarser maps",
    checked: includeCoarser,
    onChange: (evt) => setIncludeCoarser(evt.currentTarget.checked),
  });

  if (loading) return h("div.neighbor-maps", h(Spinner));
  if (error != null) return h("div.neighbor-maps", h(ErrorCallout, { error }));
  if (data == null) return null;

  const context = { subject: data.slug, hash };

  let body = h(NeighborGroups, { data, context });
  if (data.neighbors.length === 0) {
    body = h(NoNeighbors, {
      includeCoarser,
      onIncludeCoarser: () => setIncludeCoarser(true),
    });
  }

  return h("div.neighbor-maps", [
    h(Membership, { membership: data.membership, context }),
    h("h4.neighbor-heading", "Other maps of this area"),
    coarserSwitch,
    body,
  ]);
}

interface LinkContext {
  /** This map's slug, the left side of every diff. */
  subject: string;
  hash: string;
}

/** Whether carto draws this map, and the other compilations it belongs to. */
function Membership({
  membership,
  context,
}: {
  membership: MapMembership;
  context: LinkContext;
}) {
  return h("section.map-membership", [
    h(CartoStatus, { membership, context }),
    h.if(membership.compilations.length > 0)("div.membership-compilations", [
      h("span.membership-label", "Also part of"),
      membership.compilations.map((c) =>
        h(
          Link,
          {
            key: c.slug,
            href: mapHref(c.slug, context.hash),
            className: "neighbor-compilation",
          },
          h(Tag, { minimal: true, icon: "layers" }, c.name ?? c.slug)
        )
      ),
    ]),
  ]);
}

function CartoStatus({
  membership,
  context,
}: {
  membership: MapMembership;
  context: LinkContext;
}) {
  const diff = diffPath(DEFAULT_COMPILATION, context.subject) + context.hash;

  let status = h(
    Tag,
    { intent: "warning", minimal: true, icon: "disable" },
    "Not in Carto"
  );
  let detail = "The main map does not draw this map.";
  if (membership.in_carto) {
    status = h(
      Tag,
      { intent: "success", minimal: true, icon: "tick" },
      "In Carto"
    );
    detail = "Drawn on the main map";
    if (membership.carto_layers.length > 0) {
      detail += ` in the ${membership.carto_layers.join(", ")} layer`;
    }
    detail += ".";
  }

  return h("div.carto-status", [
    status,
    h("span.carto-detail", detail),
    h("div.carto-links", [
      h(Link, { href: mapHref(DEFAULT_COMPILATION, context.hash) }, "Main map"),
      h(Link, { href: diff }, "Diff with Carto"),
    ]),
  ]);
}

function NoNeighbors({ includeCoarser, onIncludeCoarser }) {
  if (includeCoarser) {
    return h(NonIdealState, {
      icon: "map",
      title: "No other maps here",
      description: "No other map overlaps or lies near this one.",
    });
  }
  return h(NonIdealState, {
    icon: "map",
    title: "No other maps at this scale",
    description:
      "No map at this scale or finer overlaps or lies near this one. Coarser maps may still cover it.",
    action: h(Button, {
      text: "Include coarser maps",
      minimal: true,
      onClick: onIncludeCoarser,
    }),
  });
}

/** Section headings, phrased against the subject map rather than in absolute
 * scale names — "finer" means something on this page, "large" does not without
 * knowing what the map itself is. */
function groupLabel(distance: number, scale: string | null): string {
  if (distance === 0) return `Same scale (${scale ?? "unknown"})`;
  if (distance === 1) return "One step finer";
  if (distance > 1) return "Much finer";
  if (distance === -1) return "One step coarser";
  return "Much coarser";
}

interface Group {
  key: string;
  title: string;
  maps: NeighborMap[];
}

/** Rows arrive ordered by relation then scale distance, so consecutive runs
 * are the groups — the server's ordering stays the one definition. */
function groupNeighbors(neighbors: NeighborMap[]): Group[] {
  const groups: Group[] = [];
  for (const map of neighbors) {
    let key = `nearby`;
    let title = "Nearby";
    if (map.relation === "overlaps") {
      key = `overlaps-${map.scale_distance}`;
      title = groupLabel(map.scale_distance, map.scale);
    }
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.maps.push(map);
    } else {
      groups.push({ key, title, maps: [map] });
    }
  }
  return groups;
}

function NeighborGroups({
  data,
  context,
}: {
  data: NeighborResult;
  context: LinkContext;
}) {
  const groups = groupNeighbors(data.neighbors);

  return h("div.neighbor-groups", [
    groups.map((group) =>
      h("section.neighbor-group", { key: group.key }, [
        h("h5.neighbor-group-title", group.title),
        h(
          "ul.neighbor-list",
          group.maps.map((map) =>
            h(NeighborItem, { key: map.source_id, map, context })
          )
        ),
      ])
    ),
  ]);
}

function NeighborItem({
  map,
  context,
}: {
  map: NeighborMap;
  context: LinkContext;
}) {
  const diff = diffPath(context.subject, map.slug) + context.hash;

  return h("li.neighbor-item", [
    h("div.neighbor-main", [
      h(
        Link,
        { href: mapHref(map.slug, context.hash), className: "neighbor-name" },
        map.name ?? map.slug
      ),
      h(Coverage, { map }),
      h(AnchorButton, {
        className: "neighbor-diff",
        href: diff,
        icon: "comparison",
        minimal: true,
        small: true,
        title: `Diff ${context.subject}...${map.slug}`,
        "aria-label": "Diff with this map",
      }),
    ]),
    h("div.neighbor-meta", [
      h.if(map.scale != null)(Tag, { minimal: true }, map.scale),
      h.if(map.in_carto)(Tag, { minimal: true, intent: "success" }, "Carto"),
      h.if(map.is_compilation)(
        Tag,
        { minimal: true, intent: "primary" },
        "compilation"
      ),
      h.if(map.superseded_by != null)(
        Tag,
        { minimal: true, intent: "warning" },
        "superseded"
      ),
      // Where this map sits in the hierarchy — often the reason it covers the
      // same ground, and a link onward into the compilation.
      map.in_compilations.map((slug) =>
        h(
          Link,
          {
            key: slug,
            href: mapHref(slug, context.hash),
            className: "neighbor-compilation",
          },
          h(Tag, { minimal: true, icon: "layers" }, slug)
        )
      ),
    ]),
  ]);
}

/** Roughly how much of *this* map the neighbour covers. An estimate from
 * bounding boxes, so it is shown coarsely. */
function Coverage({ map }: { map: NeighborMap }) {
  if (map.overlap_fraction == null) return null;

  const pct = map.overlap_fraction * 100;
  let label: string;
  if (pct >= 95) {
    label = "covers this map";
  } else if (pct >= 5) {
    label = `covers ~${Math.round(pct / 5) * 5}%`;
  } else {
    label = "overlaps slightly";
  }

  return h(
    "span.neighbor-coverage",
    { title: "Estimated from the maps' bounding boxes" },
    label
  );
}
