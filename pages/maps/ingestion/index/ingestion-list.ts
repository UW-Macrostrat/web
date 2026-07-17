import h from "./ingestion-list.module.sass";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Button,
  Intent,
  MenuItem,
  PopoverNext,
  SegmentedControl,
  Tag,
} from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { PostgrestClient } from "@supabase/postgrest-js";
import { TagEditor } from "@macrostrat/data-components";
import { useToaster } from "@macrostrat/ui-components";
import {
  SelectionInteractionStyle,
  createPostgRESTProvider,
  DataPanel,
  getSelectedRowIndices,
  TableAction,
  TableFilter,
  useSelector,
  useStoreAPI,
  createDataCard,
  DataCard,
  type ColumnSpec,
} from "@macrostrat/data-sheet";
import { RegionCardinality } from "@blueprintjs/table";
import { apiV3Prefix } from "@macrostrat-web/settings";
import classNames from "classnames";

export function IngestionListPanel({ footer }: { footer: ReactNode }) {
  const provider = useMemo(
    () =>
      createPostgRESTProvider<IngestMap>({
        endpoint,
        table: "maps",
        identityKey: "source_id",
        // Default ordering: newest source_id first. Because this is the
        // identity key's own default direction (not an active sort), it doesn't
        // appear as a removable tag in the sort/filter bar.
        identityAscending: false,
      }),
    []
  );

  return h(
    "div.data-panel-container",
    h(DataPanel<IngestMap>, {
      provider,
      columnSpec,
      itemComponent: MapCard,
      pageSize: 20,
      autoLoadPages: 2,
      itemLabel: "map",
      className: "ingestion-panel",
      statusBar: false,
      enableSelection: SelectionInteractionStyle.MODAL,
      toolbarStyle: "floating",
      contentFooter: footer,
      scrollBody: ScrollBody,
    })
  );
}

function ScrollBody({ children }: { children: ReactNode }) {
  return h("div.data-scroll-body", children);
}

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

// The PostgREST base; `.from("maps")` → `${endpoint}/maps`.
const endpoint = `${apiV3Prefix}/map-ingestion/pg`;
const TAGS_ENDPOINT = `${endpoint}/map_ingest_tags`;

interface IngestMap {
  source_id: number;
  slug: string;
  name: string;
  url: string;
  ref_year: string;
  scale: string;
  state: string;
  tags: string[];
}

// ---- Tags: auto color per tag + a preloaded, colored multi-select ----

// A stable color per tag name (Java-style string hash → RGB hex), matching the
// legacy ingestion page. Domain/presentation logic, so it lives consumer-side.
function tagHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function tagColor(name: string): string {
  const c = (tagHash(name) & 0x00ffffff).toString(16).toUpperCase();
  return "#" + ("000000" + c).slice(-6);
}

// Pick readable text (dark/light) for a background by perceived luminance —
// the legacy version skipped this and some tags were unreadable.
function textColorFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#182026" : "#ffffff";
}

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

// The defined-tag list comes from the general Macrostrat PostgREST base (the
// legacy page's `${postgrestPrefix}/map_ingest_tags`), distinct from the
// map-ingestion `pg` route. Deduped client-side; cached for the session.
let _tagsCache: string[] | null = null;
async function fetchDefinedTags(): Promise<string[]> {
  if (_tagsCache != null) return _tagsCache;
  const res = await fetch(TAGS_ENDPOINT);
  const rows = await res.json();
  _tagsCache = [...new Set(rows.map((r: any) => r.tag))].sort() as string[];
  return _tagsCache;
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
const columnSpec: ColumnSpec[] = [
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

const MapCard = createDataCard(MapCardContent, {
  className: h["map-card"],
});

// Writes go to the general PostgREST base (same as the tag *list* read).
const TAGS_PG_BASE = "https://macrostrat.local/api/pg";
const tagsTable = () =>
  new PostgrestClient(TAGS_PG_BASE).from("map_ingest_tags");
// ASSUMPTION: `map_ingest_tags` rows key on `source_id` (the maps view's
// identity). The legacy add/remove path used `ingest_process_id`; if the schema
// still keys on that, change this to `ingest_process_id` and select it on the
// `pg/maps` view so it's present on each row.
const TAG_KEY = "source_id" as const;

async function addTagToMaps(maps: IngestMap[], tag: string) {
  const rows = maps
    .filter((m) => !(m.tags ?? []).includes(tag))
    .map((m) => ({ [TAG_KEY]: m.source_id, tag }));
  if (rows.length === 0) return;
  const res: any = await tagsTable().insert(rows);
  if (res?.error != null) throw res.error;
}

async function removeTagFromMaps(maps: IngestMap[], tag: string) {
  const ids = maps
    .filter((m) => (m.tags ?? []).includes(tag))
    .map((m) => m.source_id);
  if (ids.length === 0) return;
  const res: any = await tagsTable().delete().eq("tag", tag).in(TAG_KEY, ids);
  if (res?.error != null) throw res.error;
}

// The "tool configuration": couple the shared `TagEditor` to the ingestion
// queue — usage from the selected maps' `tags`, `onChange`/`onCreate` writing to
// `map_ingest_tags`, then `refresh` re-fetches `pg/maps` (which re-derives the
// tags array). The available-tag list is read from the same API.
function MapTagEditor() {
  const selection = useSelector((s: any) => s.selection);
  const data = useSelector((s: any) => s.data);
  const storeAPI = useStoreAPI();
  const toaster = useToaster();

  const maps = useMemo(
    () =>
      getSelectedRowIndices(selection)
        .map((i) => data[i] as IngestMap)
        .filter(Boolean),
    [selection, data]
  );

  const [available, setAvailable] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);
  useEffect(() => {
    fetchDefinedTags()
      .then(setAvailable)
      .catch(() => {});
  }, []);

  const allTags = useMemo(
    () =>
      [
        ...new Set([
          ...available,
          ...created,
          ...maps.flatMap((m) => m.tags ?? []),
        ]),
      ].sort(),
    [available, created, maps]
  );

  const usage = (tag: string) => {
    if (maps.length === 0) return "none" as const;
    let n = 0;
    for (const m of maps) if (m.tags?.includes(tag)) n++;
    return (n === 0 ? "none" : n === maps.length ? "all" : "partial") as
      | "none"
      | "partial"
      | "all";
  };

  const apply = async (tag: string, add: boolean) => {
    try {
      if (add) await addTagToMaps(maps, tag);
      else await removeTagFromMaps(maps, tag);
      // Re-fetch the queue so the tags array reflects the write.
      storeAPI.getState().rowEditing?.refresh?.();
    } catch (e: any) {
      toaster?.show?.({
        message: `Tag update failed: ${e?.message ?? e}`,
        intent: "danger",
      });
    }
  };

  return h(TagEditor, {
    tags: allTags,
    usage,
    onChange: apply,
    onCreate: (tag: string) => {
      setCreated((c) => [...new Set([...c, tag])]);
      apply(tag, true);
    },
    colorForTag: (t: string) => tagColor(t),
  });
}

function MapTagEditorButton() {
  const selection = useSelector((s: any) => s.selection);
  const n = getSelectedRowIndices(selection).length;
  return h(
    PopoverNext,
    {
      placement: "bottom-start",
      content: h(
        "div",
        { style: { padding: "6px", width: "260px" } },
        h(MapTagEditor)
      ),
    },
    h(
      Button,
      { small: true, minimal: true, icon: "tag", rightIcon: "caret-down" },
      `Tags (${n})`
    )
  );
}

const tagEditAction: TableAction<IngestMap> = {
  id: "edit-tags",
  name: "Tags",
  icon: "tag",
  targets: [RegionCardinality.FULL_ROWS],
  requiresEditable: false,
  render: () => h(MapTagEditorButton),
};

/**
 * Live tag editing against the `map_ingest_tags` API. Select maps (shift/cmd),
 * open **Tags** → the shared `TagEditor` seeded from the tags API, each tag
 * showing its usage across the selection. Add/remove writes to
 * `map_ingest_tags` (POST/DELETE) and re-fetches the queue. Requires the local
 * stack + write grants on `map_ingest_tags`; the row key is assumed to be
 * `source_id` (see `TAG_KEY`).
 */
// export const TagEditing: StoryObj = {
//   render: () =>
//     h(IngestionListPanel, { actions: [tagEditAction, archiveAction] }),
// };
