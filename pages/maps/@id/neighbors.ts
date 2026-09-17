/** "Other maps of this area" — the maps whose footprint overlaps this one's, at
 * this scale or finer.
 *
 * An area question rather than a point one: the subject is this map's own
 * boundary, so the API intersects footprints and reports how much of *this* map
 * each neighbour covers.
 *
 * Coarser maps are left out by default. Every map is covered by the same handful
 * of global and continental sheets, so listing them puts identical answers on
 * every page and buries the ones that mean something; a toggle brings them back
 * as context. What is left is grouped by scale — peers first, then the finer
 * maps that cover only part of this one, which are the other half of the
 * question.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";
import { NonIdealState, Spinner, Switch, Tag } from "@blueprintjs/core";
import { ErrorCallout } from "@macrostrat/ui-components";
import { useEffect, useState } from "react";

import { Link } from "~/components";
import h from "./main.module.sass";

interface NeighborMap {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  ref_year: string | null;
  superseded_by: number | null;
  area_km: number | null;
  overlap_km: number | null;
  /** How much of *this* map the neighbour covers, 0–1. */
  overlap_fraction: number | null;
  /** 0 for a peer at the same scale, 1 for one band finer; negative for a
   * coarser map, which only appears when asked for. */
  scale_distance: number;
  is_compilation: boolean;
  is_documentary: boolean;
  in_compilations: string[];
}

interface NeighborResult {
  source_id: number;
  slug: string;
  /** False when this map's boundary is too large to intersect in reasonable
   * time; the list is then ordered by scale and footprint instead. */
  overlap_available: boolean;
  include_coarser: boolean;
  neighbors: NeighborMap[];
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

export function NeighborMaps({ mapInfo }) {
  // The panel is only mounted when its tab is open, so the request is made on
  // demand rather than on every map page load.
  const ident = mapInfo?.slug ?? mapInfo?.source_id ?? null;
  const [includeCoarser, setIncludeCoarser] = useState(false);
  const { data, error, loading } = useNeighbors(ident, includeCoarser);

  const coarserSwitch = h(Switch, {
    className: "neighbor-coarser",
    label: "Include coarser maps",
    checked: includeCoarser,
    onChange: (evt) => setIncludeCoarser(evt.currentTarget.checked),
  });

  let body = null;
  if (loading) {
    body = h(Spinner);
  } else if (error != null) {
    body = h(ErrorCallout, { error });
  } else if (data == null) {
    body = null;
  } else if (data.neighbors.length === 0) {
    body = h(NonIdealState, {
      icon: "map",
      title: "No other maps here",
      description:
        "No map at this scale or finer overlaps this one. Coarser maps may still cover it.",
    });
  } else {
    body = h(NeighborGroups, { data });
  }

  return h("div.neighbor-maps", [coarserSwitch, body]);
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

function NeighborGroups({ data }: { data: NeighborResult }) {
  // Rows arrive already ordered by scale distance, so consecutive runs are the
  // groups — no re-sorting, and the server's ordering stays the one definition.
  const groups: { distance: number; maps: NeighborMap[] }[] = [];
  for (const map of data.neighbors) {
    const last = groups[groups.length - 1];
    if (last != null && last.distance === map.scale_distance) {
      last.maps.push(map);
    } else {
      groups.push({ distance: map.scale_distance, maps: [map] });
    }
  }

  let caveat = null;
  if (!data.overlap_available) {
    caveat = h(
      "p.neighbor-caveat",
      "This map's boundary is too large to measure overlap against; these are the closest-scale maps that touch it."
    );
  }

  return h("div.neighbor-groups", [
    caveat,
    groups.map((group) =>
      h("section.neighbor-group", { key: group.distance }, [
        h(
          "h5.neighbor-group-title",
          groupLabel(group.distance, group.maps[0]?.scale)
        ),
        h(
          "ul.neighbor-list",
          group.maps.map((map) => h(NeighborItem, { key: map.source_id, map }))
        ),
      ])
    ),
  ]);
}

function NeighborItem({ map }: { map: NeighborMap }) {
  return h("li.neighbor-item", [
    h("div.neighbor-main", [
      h(
        Link,
        { href: `/maps/${map.slug}`, className: "neighbor-name" },
        map.name ?? map.slug
      ),
      h(Coverage, { map }),
    ]),
    h("div.neighbor-meta", [
      h.if(map.scale != null)(Tag, { minimal: true }, map.scale),
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
            href: `/maps/${slug}`,
            className: "neighbor-compilation",
          },
          h(Tag, { minimal: true, icon: "layers" }, slug)
        )
      ),
    ]),
  ]);
}

/** How much of *this* map the neighbour covers. Rounded to something readable:
 * the precision is not the point, the ordering is. */
function Coverage({ map }: { map: NeighborMap }) {
  if (map.overlap_fraction == null) return null;

  const pct = map.overlap_fraction * 100;
  let label: string;
  if (pct >= 99.5) {
    label = "covers all of this map";
  } else if (pct >= 1) {
    label = `covers ${Math.round(pct)}%`;
  } else {
    label = "overlaps slightly";
  }

  return h(
    "span.neighbor-coverage",
    { title: `${pct.toFixed(2)}% of this map` },
    label
  );
}
