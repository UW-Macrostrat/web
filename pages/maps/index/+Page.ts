/** The map catalog, on the hybrid content/map frame.
 *
 * Every map is held in memory (~860 rows), so the list's filters can apply to
 * the map too: both read the same `TableFilter` predicates. */

import { Button, Tag } from "@blueprintjs/core";
import {
  DataPanel,
  DataPanelToolbarStyle,
  SelectionInteractionStyle,
  createLocalProvider,
  useSelector,
  type ActiveFilterEntry,
  type InitialDataChunk,
} from "@macrostrat/data-sheet";
import { Identifier } from "@macrostrat/data-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { useData } from "vike-react/useData";

import { initialViewStateFromURL } from "~/components";
import { LinkCard } from "~/components/cards";
import { mapPageHref } from "~/components/compilation-tree";
import { autoLoadPagesForItems } from "~/components/data-view";
import {
  HybridContentFooter,
  HybridPage,
  type HybridLink,
} from "~/layouts/hybrid";
import { locationAtom } from "~/_utils/url-atoms";
import { onDemand } from "~/_utils";

import type { CompilationOption, MapRow } from "./compilations";
import {
  compilationFilter,
  mapURLBindings,
  scaleFilter,
  searchFilter,
} from "./filters";
import {
  allMapsAtom,
  assistantIdleAtom,
  compilationsAtom,
  inspectedMapsAtom,
  inspectedPointAtom,
  visibleMapsAtom,
} from "./state";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const MapListMap = onDemand(() =>
  import("./map.client").then((mod) => mod.MapListMap)
);

const PAGE_SIZE = 60;
const AUTO_LOAD_PAGES = autoLoadPagesForItems(PAGE_SIZE);

const columnSpec = [
  { key: "source_id", name: "ID", dataType: "integer" },
  { key: "name", name: "Name" },
  { key: "scale", name: "Scale" },
];

const mapListLinks: HybridLink[] = [
  { label: "Ingestion system", href: "/maps/ingestion", icon: "flows" },
  { label: "Legend table", href: "/maps/legend", icon: "th", tag: "Dev" },
];

interface MapListData {
  maps: MapRow[];
  compilations: CompilationOption[];
  search: string;
}

export function Page() {
  const data = useData<MapListData>();

  return h(HybridPage, {
    capabilities: { defaultMode: "content-primary" },
    initialAtoms: [
      [allMapsAtom, data.maps ?? []],
      [compilationsAtom, data.compilations ?? []],
    ],
    links: mapListLinks,
    content: h(MapList, { search: data.search }),
    map: h(MapListMap),
    assistant: h(MapAssistant),
    assistantIdle: assistantIdleAtom,
  });
}

/* ----------------------------------------------------------------- the list */

function MapList({ search }) {
  const rows = useAtomValue(allMapsAtom);
  const compilations = useAtomValue(compilationsAtom);

  // Passed as a provider rather than `data`, so the panel pages it
  const provider = useMemo(
    () => createLocalProvider<MapRow>(rows, { identity: (row) => row.source_id }),
    [rows]
  );

  // Without the compilation graph there is nothing to filter by
  const filters = useMemo(() => {
    if (compilations.length === 0) return [searchFilter, scaleFilter];
    return [searchFilter, scaleFilter, compilationFilter];
  }, [compilations]);

  // The URL is read once, here; afterwards it only follows the filters
  const initialView = useMemo(
    () => initialViewStateFromURL(mapURLBindings, { sortParam: null, search }),
    []
  );
  const initialData = useMemo(
    () => firstPage(applyRowFilters(rows, initialView.initialFilters)),
    []
  );

  return h(
    DataPanel<MapRow>,
    {
      className: "map-panel",
      name: "Maps",
      itemLabel: "map",
      provider,
      initialFilters: initialView.initialFilters,
      initialData,
      filterDebounce: 200,
      pageSize: PAGE_SIZE,
      autoLoadPages: AUTO_LOAD_PAGES,
      columnSpec: columnSpec as any,
      filters,
      itemComponent: MapCard,
      scrollBody: MapGrid,
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      enableSelection: SelectionInteractionStyle.NEVER,
      contentFooter: h(HybridContentFooter),
    },
    [
      h(VisibleRowsBridge, { key: "visible" }),
      h(FilterURLWriter, { key: "url" }),
    ]
  );
}

function MapGrid({ children }) {
  return h("div.map-grid", children);
}

function applyRowFilters(rows: MapRow[], entries: ActiveFilterEntry[]) {
  if (entries.length === 0) return rows;
  return rows.filter((row) =>
    entries.every(({ filter, state }) => {
      if (filter?.predicate == null) return true;
      return filter.predicate(row, state);
    })
  );
}

function firstPage(rows: MapRow[]): InitialDataChunk<MapRow> {
  return { rows: rows.slice(0, PAGE_SIZE), totalCount: rows.length };
}

/** The whole filtered set for the map — the panel's own data is paged. */
function VisibleRowsBridge() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const rows = useAtomValue(allMapsAtom);
  const setVisible = useSetAtom(visibleMapsAtom);

  useEffect(() => {
    const entries = [...(activeFilters?.values() ?? [])];
    setVisible(applyRowFilters(rows, entries));
  }, [rows, activeFilters, setVisible]);

  return null;
}

const writeParamsAtom = atom(
  null,
  (get, set, params: Record<string, string | null>) => {
    const loc = get(locationAtom);
    const searchParams = new URLSearchParams(loc.searchParams);
    for (const [param, value] of Object.entries(params)) {
      if (value == null || value === "") {
        searchParams.delete(param);
      } else {
        searchParams.set(param, value);
      }
    }
    set(locationAtom, { ...loc, searchParams });
  }
);

/** Writes the filters to the query string, one way and after a pause. */
function FilterURLWriter() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const writeParams = useSetAtom(writeParamsAtom);

  const params = useMemo(() => {
    const values: Record<string, string | null> = {};
    for (const binding of mapURLBindings) {
      const state = activeFilters?.get(binding.filter.id)?.state;
      let next = Object.fromEntries(binding.params.map((p) => [p, null]));
      if (state != null) next = { ...next, ...binding.toParams(state) };
      Object.assign(values, next);
    }
    return values;
  }, [activeFilters]);
  const key = JSON.stringify(params);

  // The first run restates the URL the page loaded with
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const handle = setTimeout(() => writeParams(params), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [key, writeParams]);

  return null;
}

/* ------------------------------------------------------------------ cards */

function MapCard({ data }: { data: MapRow }) {
  const { source_id, name, scale, ref_source, ref_year, ref_title } = data;

  let scaleTag = null;
  if (scale != null) {
    scaleTag = h(
      Tag,
      { minimal: true, round: true, className: `scale-tag scale-${scale}` },
      scale
    );
  }

  const citation = [ref_source, ref_year].filter((v) => v != null && v !== "");

  return h(
    LinkCard,
    {
      className: "map-card",
      density: "list",
      href: mapPageHref(data),
      title: h("span.map-head", [
        h("span.map-name", { key: "name" }, name ?? data.slug),
        scaleTag,
      ]),
      label: name ?? data.slug,
    },
    h("div.map-meta", [
      h("span.map-citation", { title: ref_title ?? undefined }, citation.join(", ")),
      h("span.map-identifier", h(Identifier, { id: source_id })),
    ])
  );
}

/* -------------------------------------------------------------- assistant */

function MapAssistant() {
  const [point, setPoint] = useAtom(inspectedPointAtom);
  const maps = useAtomValue(inspectedMapsAtom);

  if (point == null) {
    return h("div.assistant", [
      h(
        "p.assistant-empty",
        "Click the map to list the maps covering a point."
      ),
    ]);
  }

  let heading = `${maps.length} maps here`;
  if (maps.length === 1) heading = "1 map here";

  let body = h("p.assistant-empty", "No maps cover this point.");
  if (maps.length > 0) {
    body = h(
      "ul.assistant-maps",
      maps.map((row) =>
        h("li", { key: row.source_id }, [
          h("a", { href: mapPageHref(row) }, row.name ?? row.slug),
          h("span.map-identifier", h(Identifier, { id: row.source_id })),
        ])
      )
    );
  }

  return h("div.assistant", [
    h("div.assistant-header", [
      h("h2", heading),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        title: "Clear the point",
        onClick: () => setPoint(null),
      }),
    ]),
    h(
      "p.assistant-point",
      `${point.lat.toFixed(4)}°, ${point.lng.toFixed(4)}°`
    ),
    body,
  ]);
}
