/** Regions (stored as "geologic boundaries"): physiographic provinces, basins
 * and the like, on the hybrid content/map frame.
 *
 * Every region is held in memory without its geometry, as on `/maps`, so one
 * set of `TableFilter` predicates drives the list and the map. */

import {
  AnchorButton,
  Button,
  NonIdealState,
  Spinner,
  Tag,
} from "@blueprintjs/core";
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
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useData } from "vike-react/useData";

import { ViewStateURLSync, initialViewStateFromURL } from "~/components";
import { LinkCard } from "~/components/cards";
import { autoLoadPagesForItems } from "~/components/data-view";
import { HybridContentFooter, HybridPage } from "~/layouts/hybrid";
import { onDemand } from "~/_utils";

import {
  fetchRegion,
  type Region,
  type RegionDetail,
  type RegionSource,
} from "./api";
import {
  classFilter,
  regionFilters,
  regionURLBindings,
  searchFilter,
  sourceFilter,
} from "./filters";
import {
  allRegionsAtom,
  assistantIdleAtom,
  focusedRegionsAtom,
  inspectedPointAtom,
  mapFilterAtom,
  selectedRegionIDAtom,
  sourcesAtom,
  type MapFilter,
} from "./state";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const RegionsMap = onDemand(() =>
  import("./map.client").then((mod) => mod.RegionsMap)
);

const PAGE_SIZE = 60;
const AUTO_LOAD_PAGES = autoLoadPagesForItems(PAGE_SIZE);

const columnSpec = [
  { key: "region_id", name: "ID", dataType: "integer" },
  { key: "name", name: "Name" },
  { key: "region_class", name: "Class" },
];

interface RegionListData {
  regions: Region[];
  sources: RegionSource[];
  search: string;
  error: string | null;
}

export function Page() {
  const data = useData<RegionListData>();

  let content = h(RegionList, { search: data.search });
  if (data.error != null) {
    content = h(NonIdealState, {
      icon: "error",
      title: "Could not load regions",
      description: data.error,
    });
  }

  return h(HybridPage, {
    capabilities: { defaultMode: "map-primary" },
    initialAtoms: [
      [allRegionsAtom, data.regions ?? []],
      [sourcesAtom, data.sources ?? []],
    ],
    content,
    map: h(RegionsMap),
    assistant: h(RegionAssistant),
    assistantIdle: assistantIdleAtom,
  });
}

/* ----------------------------------------------------------------- the list */

function RegionList({ search }) {
  const rows = useAtomValue(allRegionsAtom);

  // Passed as a provider rather than `data`, so the panel pages it
  const provider = useMemo(
    () =>
      createLocalProvider<Region>(rows, { identity: (row) => row.region_id }),
    [rows]
  );

  // The URL is read once, here; afterwards it follows the filters
  const initialView = useMemo(
    () =>
      initialViewStateFromURL(regionURLBindings, { sortParam: null, search }),
    []
  );
  const initialData = useMemo(
    () => firstPage(applyRowFilters(rows, initialView.initialFilters)),
    []
  );

  return h(
    DataPanel<Region>,
    {
      className: "region-panel",
      name: "Regions",
      itemLabel: "region",
      provider,
      initialFilters: initialView.initialFilters,
      initialData,
      filterDebounce: 200,
      pageSize: PAGE_SIZE,
      autoLoadPages: AUTO_LOAD_PAGES,
      columnSpec: columnSpec as any,
      filters: regionFilters,
      itemComponent: RegionCard,
      scrollBody: RegionGrid,
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      enableSelection: SelectionInteractionStyle.NEVER,
      contentFooter: h(HybridContentFooter),
    },
    [
      h(MapFilterBridge, { key: "map-filter" }),
      h(ViewStateURLSync, {
        key: "url",
        bindings: regionURLBindings,
        sortParam: null,
      }),
    ]
  );
}

function RegionGrid({ children }) {
  return h("div.region-grid", children);
}

function applyRowFilters(rows: Region[], entries: ActiveFilterEntry[]) {
  if (entries.length === 0) return rows;
  return rows.filter((row) =>
    entries.every(({ filter, state }) => {
      if (filter?.predicate == null) return true;
      return filter.predicate(row, state);
    })
  );
}

function firstPage(rows: Region[]): InitialDataChunk<Region> {
  return { rows: rows.slice(0, PAGE_SIZE), totalCount: rows.length };
}

/** Restates the panel's filters for the map, whose tiles carry source and
 * class but not the searched text. */
function MapFilterBridge() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const rows = useAtomValue(allRegionsAtom);
  const setMapFilter = useSetAtom(mapFilterAtom);

  useEffect(() => {
    setMapFilter(buildMapFilter(rows, activeFilters));
  }, [rows, activeFilters, setMapFilter]);

  return null;
}

function buildMapFilter(rows: Region[], activeFilters): MapFilter | null {
  const source = activeFilters?.get(sourceFilter.id)?.state;
  const regionClass = activeFilters?.get(classFilter.id)?.state;
  const search = activeFilters?.get(searchFilter.id);
  if (source == null && regionClass == null && search == null) return null;

  let ids: number[] | null = null;
  if (search != null) {
    ids = applyRowFilters(rows, [search]).map((row) => row.region_id);
  }
  return {
    sourceID: source?.source_id ?? null,
    regionClass: regionClass?.value ?? null,
    ids,
  };
}

/* ------------------------------------------------------------------ cards */

function regionSubtitle(row: Region) {
  const parts = [row.region_type, row.region_group];
  return parts.filter((v) => v != null && v !== "").join(" · ");
}

function ClassTag({ value }) {
  if (value == null) return null;
  return h(
    Tag,
    {
      minimal: true,
      round: true,
      className: `class-tag class-${value.toLowerCase()}`,
    },
    value
  );
}

function RegionCard({ data }: { data: Region }) {
  const { region_id, name, region_class } = data;
  const select = useSelectRegion();
  const selectedID = useAtomValue(selectedRegionIDAtom);

  let className = "region-card";
  if (selectedID === region_id) className = "region-card selected";

  const label = name ?? `Region ${region_id}`;

  return h(
    LinkCard,
    {
      className,
      density: "list",
      // A real link, so the region can be opened in a new tab or copied
      href: `?region=${region_id}`,
      onClick: (event) => {
        // Vike routes anchor clicks from the document, ignoring `preventDefault`
        event.preventDefault();
        event.stopPropagation();
        select(region_id);
      },
      title: h("span.region-head", [
        h("span.region-name", { key: "name" }, label),
        h(ClassTag, { key: "class", value: region_class }),
      ]),
      label,
    },
    h("div.region-meta", [
      h("span.region-subtitle", regionSubtitle(data)),
      h("span.region-identifier", h(Identifier, { id: region_id })),
    ])
  );
}

function useSelectRegion() {
  const setSelected = useSetAtom(selectedRegionIDAtom);
  const setPoint = useSetAtom(inspectedPointAtom);
  return (id: number | null) => {
    setPoint(null);
    setSelected(id);
  };
}

/* -------------------------------------------------------------- assistant */

function RegionAssistant() {
  const regions = useAtomValue(focusedRegionsAtom);
  const point = useAtomValue(inspectedPointAtom);
  const selectedID = useAtomValue(selectedRegionIDAtom);
  const select = useSelectRegion();

  if (point == null && selectedID == null) {
    return h("div.assistant", [
      h(
        "p.assistant-empty",
        "Click the map, or a region in the list, for details."
      ),
    ]);
  }

  let heading = "Region";
  let location = null;
  if (selectedID == null) {
    heading = `${regions.length} regions here`;
    if (regions.length === 1) heading = "1 region here";
    location = h(
      "p.assistant-point",
      `${point.lat.toFixed(4)}°, ${point.lng.toFixed(4)}°`
    );
  }

  let body = h("p.assistant-empty", "No regions cover this point.");
  if (selectedID != null) {
    body = h("p.assistant-empty", `No region with ID ${selectedID}.`);
  }
  if (regions.length > 0) {
    body = h(
      "div.region-details",
      regions.map((row) =>
        h(RegionDetails, { key: row.region_id, region: row })
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
        title: "Clear",
        onClick: () => select(null),
      }),
    ]),
    location,
    body,
  ]);
}

/** A region's description and citation, after Rockd's "Regional info". */
function RegionDetails({ region }: { region: Region }) {
  const { detail, error } = useRegionDetail(region.region_id);
  const select = useSelectRegion();
  const selectedID = useAtomValue(selectedRegionIDAtom);

  let zoomButton = null;
  if (selectedID !== region.region_id) {
    zoomButton = h(Button, {
      minimal: true,
      small: true,
      icon: "zoom-to-fit",
      title: "Zoom to this region",
      onClick: () => select(region.region_id),
    });
  }

  let body = h(Spinner, { size: 16 });
  if (error != null) body = h("p.assistant-empty", error);
  if (detail != null) body = h(RegionDescription, { detail });

  return h("div.region-detail", [
    h("div.assistant-header", [
      h("h3", region.name ?? `Region ${region.region_id}`),
      zoomButton,
    ]),
    h("div.region-meta", [
      h(ClassTag, { value: region.region_class }),
      h("span.region-subtitle", regionSubtitle(region)),
      h("span.region-identifier", h(Identifier, { id: region.region_id })),
    ]),
    body,
  ]);
}

function RegionDescription({ detail }: { detail: RegionDetail }) {
  let description = null;
  if (detail.description) {
    description = h("p.region-description", detail.description);
  }

  let wikiLink = null;
  if (detail.wiki_link) {
    wikiLink = h(
      AnchorButton,
      {
        minimal: true,
        small: true,
        href: detail.wiki_link,
        target: "_blank",
        rightIcon: "share",
      },
      "Learn more"
    );
  }

  return h("div", [
    description,
    h(SourceReference, { source: detail.source }),
    wikiLink,
  ]);
}

function SourceReference({ source }: { source: RegionSource | null }) {
  if (source == null) return null;
  const { authors, ref_year, ref_title, ref_source, isbn_doi, url } = source;

  let title: any = ref_title ?? source.name;
  if (url) title = h("a", { href: url, target: "_blank" }, title);

  const before = [authors, ref_year].filter(Boolean).join(", ");
  const after = [ref_source, isbn_doi].filter(Boolean).join(", ");

  let lead = null;
  if (before !== "") lead = `${before}, `;
  let tail = ".";
  if (after !== "") tail = `: ${after}.`;

  return h("p.region-reference", [lead, title, tail]);
}

function useRegionDetail(id: number) {
  const [state, setState] = useState<{
    detail: RegionDetail | null;
    error: string | null;
  }>({ detail: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ detail: null, error: null });
    fetchRegion(id, controller.signal)
      .then((detail) => setState({ detail, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          detail: null,
          error: `Could not load details: ${err.message}`,
        });
      });
    return () => controller.abort();
  }, [id]);

  return state;
}
