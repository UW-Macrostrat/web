import h from "./ingestion-list.module.sass";
import { useEffect, useMemo, useState } from "react";
import { Intent, MenuItem, SegmentedControl, Tag } from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import {
  type ColumnSpec,
  createDataCard,
  getSelectedRowIndices,
  TableAction,
  TableFilter,
  useSelector,
  useStoreAPI,
} from "@macrostrat/data-sheet";
import { RegionCardinality } from "@blueprintjs/table";
import { apiV3Prefix } from "@macrostrat-web/settings";
import classNames from "classnames";
import {
  fetchDefinedTags,
  MapTagControlButton,
  tagColor,
  textColorFor,
  type TaggableMap,
} from "../components/map-tags";
const endpoint = `${apiV3Prefix}/map-ingestion/pg`;

/**
 * DataPanel is the card-list renderer over the same headless core as
 * `DataSheet` (loader + view state + selection + actions). This story drives it
 * live against Macrostrat's map-ingestion queue — a **standard PostgREST route**
 * (`/api/v3/map-ingestion/pg/maps`), so the exact same provider that will back
 * the production page runs here in the library. Server-side filter / sort /
 * paginate all work against real data.
 *
 * Requires the local Macrostrat stack (`macrostrat.local`).
 */

export interface IngestMap {
  source_id: number;
  slug: string;
  name: string;
  url: string;
  ref_year: string;
  scale: string;
  state: string;
  tags: string[];
}

// ---- Tags ----
// Color helpers, the defined-tag fetch, and the write path live in the shared
// `map-tags` module (source_id-keyed, reused by the per-map page). This file
// keeps only the list-specific bits: the card tag chips and the filter UI.

function TagItem({
  name,
  interactive,
  onRemove,
}: {
  name: string;
  interactive?: boolean;
  onRemove?: () => void;
}) {
  const bg = tagColor(name);
  return h(
    Tag,
    {
      interactive,
      onRemove,
      style: { backgroundColor: bg, color: textColorFor(bg) },
    },
    name
  );
}

interface TagFilterState {
  operator: "ov";
  value: string;
}

// A richer, "lifelike" tag selector: preloads the defined tags from the API and
// presents a colored typeahead multi-select. State stays the `{ operator, value }`
// shape (`ov` + a comma-joined set), so it translates server-side to
// `tags=ov.{…}` ("has any of") via the standard array-operator contract.
function TagFilterForm({
  state,
  setState,
}: {
  state: TagFilterState;
  setState: (s: TagFilterState) => void;
}) {
  const [all, setAll] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchDefinedTags()
      .then(setAll)
      .catch(() => setFailed(true));
  }, []);

  const selected = (state?.value ?? "").split(",").filter(Boolean);
  const commit = (next: string[]) =>
    setState({ operator: "ov", value: next.join(",") });
  const toggle = (tag: string) =>
    commit(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );

  return h(MultiSelect<string>, {
    items: all,
    selectedItems: selected,
    fill: true,
    resetOnSelect: true,
    placeholder: failed ? "Couldn't load tags" : "Filter by tag…",
    itemPredicate: (q: string, tag: string) =>
      tag.toLowerCase().includes(q.toLowerCase()),
    itemRenderer: (tag: string, { handleClick, modifiers }: any) =>
      modifiers.matchesPredicate
        ? h(MenuItem, {
            key: tag,
            active: modifiers.active,
            icon: selected.includes(tag) ? "tick" : "blank",
            text: h(TagItem, { name: tag }),
            shouldDismissPopover: false,
            onClick: handleClick,
          })
        : null,
    tagRenderer: (tag: string) => tag,
    onItemSelect: toggle,
    onRemove: (tag: string) => toggle(tag),
    tagInputProps: {
      tagProps: (_node: any, index: number) => {
        const bg = tagColor(selected[index]);
        return { style: { backgroundColor: bg, color: textColorFor(bg) } };
      },
    },
    popoverProps: { minimal: true },
    noResults: h(MenuItem, {
      disabled: true,
      text: failed ? "Failed to load tags" : "No matching tags",
    }),
  });
}

const tagsFilter: TableFilter<IngestMap, TagFilterState> = {
  id: "tags-filter",
  name: "Tags",
  icon: "tag",
  columnKey: "tags",
  defaultState: { operator: "ov", value: "" },
  describeState: (s) => {
    const v = (s?.value ?? "").split(",").filter(Boolean);
    return v.length === 0 ? null : v.length === 1 ? v[0] : `${v.length} tags`;
  },
  predicate: (row, s) => {
    const want = (s?.value ?? "").split(",").filter(Boolean);
    return (
      want.length === 0 ||
      (Array.isArray(row.tags) && want.some((t) => row.tags.includes(t)))
    );
  },
  filterForm: TagFilterForm,
};

// A custom filter for `scale`: a fixed enum with only four values, so a
// segmented control fits better than the generic operator+text form. Its state
// is still the `{ operator, value }` shape, so the provider's default
// translation turns it into `scale=eq.<value>` server-side — a custom *UI* over
// the standard server contract, no custom `translateFilter` needed.
const SCALES = ["tiny", "small", "medium", "large"];

const scaleFilter: TableFilter<
  IngestMap,
  { operator: "eq"; value: string | null }
> = {
  id: "scale-filter",
  name: "Scale",
  icon: "filter",
  columnKey: "scale",
  defaultState: { operator: "eq", value: null },
  describeState: (s) => s?.value ?? null,
  predicate: (row, s) => s?.value == null || row.scale === s.value,
  filterForm: ({ state, setState }) =>
    h(SegmentedControl, {
      small: true,
      options: SCALES.map((v) => ({ label: v, value: v })),
      value: state?.value ?? "",
      onValueChange: (value: string) => setState({ operator: "eq", value }),
    }),
};

// Facet capabilities are declared per-column, backend-agnostic. `FacetControls`
// + the server provider read these to offer/apply filter & sort.
export const columnSpec: ColumnSpec[] = [
  {
    key: "name",
    name: "Name",
    dataType: "text",
    filterable: true,
    sortable: true,
  },
  {
    key: "state",
    name: "Status",
    dataType: "string",
    filterable: true,
    sortable: true,
  },
  // Custom filter UI (segmented) instead of the generic operator form.
  {
    key: "scale",
    name: "Scale",
    dataType: "string",
    filters: [scaleFilter],
    sortable: true,
  },
  {
    key: "ref_year",
    name: "Year",
    dataType: "string",
    filterable: true,
    sortable: true,
  },
  { key: "source_id", name: "Source ID", dataType: "integer", sortable: true },
  // Array column with a rich, preloaded tag selector (`tagsFilter`) over the
  // `dataType: "array"` operator family → PostgREST `tags=ov.{…}` ("has any of").
  { key: "tags", name: "Tags", dataType: "array", filters: [tagsFilter] },
];

const STATE_INTENT: Record<string, Intent> = {
  failed: "danger",
  pending: "warning",
  processing: "primary",
  succeeded: "success",
  abandoned: "none",
};

function MapCardContent({ data, selectable }) {
  // `onSelect` reads shift / cmd / ctrl straight from the click event — wiring
  // it as the root `onClick` gives range- and toggle-select for free.
  return h(
    "a.map-card-content",
    {
      href: `/maps/ingestion/${data.source_id}`,
      className: classNames({ selectable }),
    },
    [
      h("div.card-header", [
        h("span.map-name", data.name ?? data.slug),
        h.if(data.state != null)(Tag, {
          minimal: true,
          intent: STATE_INTENT[data.state] ?? "none",
          children: data.state,
        }),
      ]),
      h("div.map-meta", [
        h.if(data.scale != null)(
          "span",
          { key: "scale" },
          `Scale: ${data.scale}`
        ),
        h.if(data.ref_year != null)("span", { key: "year" }, data.ref_year),
        h("span", `#${data.source_id}`),
      ]),
      h.if(Array.isArray(data.tags) && data.tags.length > 0)(
        "div.tags",
        (data.tags ?? []).map((t) => h(TagItem, { key: t, name: t }))
      ),
    ]
  );
}

export const MapCard = createDataCard(MapCardContent, {
  className: h["map-card"],
});

// Bridge the data-panel store to the shared, store-agnostic tag control: pull
// the selected maps out of the store and hand them + a refresh to
// `MapTagControlButton`. All the API/edit logic (source_id-keyed) lives in
// `map-tags`, so the per-map page reuses the exact same write path.
function SelectionTagButton() {
  const selection = useSelector((s: any) => s.selection);
  const data = useSelector((s: any) => s.data);
  const storeAPI = useStoreAPI();

  const maps = useMemo(
    () =>
      getSelectedRowIndices(selection)
        .map((i) => data[i] as TaggableMap)
        .filter(Boolean),
    [selection, data]
  );

  const onChanged = () => storeAPI.getState().rowEditing?.refresh?.();

  return h(MapTagControlButton, { maps, onChanged });
}

/**
 * Selection-scoped tag action for the ingestion list: select maps (shift/cmd),
 * open **Tags** → the shared multi-select `TagEditor`, each tag showing its
 * usage across the selection. Add/remove writes to the source_id-keyed tag API
 * (see `map-tags`) and re-fetches the queue.
 */
export const tagEditAction: TableAction<IngestMap> = {
  id: "edit-tags",
  name: "Tags",
  icon: "tag",
  targets: [RegionCardinality.FULL_ROWS],
  requiresEditable: false,
  render: () => h(SelectionTagButton),
};
