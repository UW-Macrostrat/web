import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useMemo, Suspense } from "react";

import { ContentPage } from "~/layouts";
import { Link, DevLinkButton, PageBreadcrumbs } from "~/components";
import { LithologyTag } from "~/components/lex/tag";
import { Footer, SearchBar } from "~/components/general";
import {
  ColumnFilterOptions,
  ColumnGroup,
  getGroupedColumns,
} from "./grouped-cols";
import { ErrorBoundary, FlexRow } from "@macrostrat/ui-components";

import {
  AnchorButton,
  ButtonGroup,
  Switch,
  Popover,
  Spinner,
} from "@blueprintjs/core";
import { Tag, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { ClientOnly } from "vike-react/ClientOnly";
import { navigate } from "vike/client/router";

import { postgrest } from "~/_providers";

/**
 * Jotai provides a composable approach to state management
 * that can be used to add behaviors iteratively
 */

import { atom, useAtom, useAtomValue, useSetAtom, Provider } from "jotai";
import { unwrap, useHydrateAtoms } from "jotai/utils";
import { debounce } from "underscore";

const h = hyper.styled(styles);

function ColumnMapContainer(props) {
  return h(
    ClientOnly,
    {
      load: () => import("./map.client").then((d) => d.ColumnMapContainer),
      fallback: h(Spinner),
      deps: [props.columnIDs, props.projectID],
    },
    (component) => h(component, props)
  );
}

type ColumnFilterKey =
  | "liths"
  | "stratNames"
  | "intervals"
  | "concepts"
  | "environments";

type ColumnFilterDef = {
  type: ColumnFilterKey;
  identifier: number;
  name: string;
  color: string;
};

const columnFilterAtom = atom<ColumnFilterDef[]>([]);

const addFilterAtom = atom(null, (_, set, data: ColumnFilterDef) => {
  set(columnFilterAtom, (value) => {
    return [...value, data];
  });
  set(inputTextAtom, ""); // Clear input text when adding a filter
});

const showEmptyAtom = atom(true);
const showInProcessAtom = atom(false);

const inputTextAtom = atom("");

const suggestedFiltersFetchAtom = atom(async (get) => {
  const inputText = get(inputTextAtom);
  if (inputText.length < 3) return [];
  return await fetchFilterItems(inputText);
});

const suggestedFiltersAtom = unwrap(suggestedFiltersFetchAtom, (prev) => {
  return prev ?? [];
});

const filterParamsAtom = atom((get) => {
  const filters = get(columnFilterAtom);
  const showEmpty = get(showEmptyAtom);
  const showInProcess = get(showInProcessAtom);
  const projectID = get(projectIDAtom);

  const params = buildParamsFromFilters(filters);

  if (projectID == null) return null;

  params.project_id = projectID;

  if (!showEmpty) {
    params.empty = false;
  }
  if (!showInProcess) {
    params.status_code = "active";
  }

  if (Object.keys(params).length === 0) {
    return null;
  }

  return params as ColumnFilterOptions;
});

const projectIDAtom = atom<number | null>();

const fetchDataAtom = atom(async (get) => {
  const filterParams = get(filterParamsAtom);
  return await instrumentResult(getGroupedColumns(filterParams));
});

const initialDataAtom = atom<ColumnGroup[]>();

const downloadedGroupsAtom = unwrap(fetchDataAtom, (prev) => {
  return {
    data: prev?.data ?? null,
    error: prev?.error ?? null,
    loading: true,
  };
});

const isLoadingAtom = atom((get) => {
  const downloaded = get(downloadedGroupsAtom);
  return downloaded.loading;
});

const filteredGroupsAtom = atom((get) => {
  /** Apply client-side text filtering to column names */
  const result = get(downloadedGroupsAtom).data ?? get(initialDataAtom) ?? [];
  const inputText = get(inputTextAtom).toLowerCase();
  if (inputText.length < 3) return result;

  return result
    .map((group) => {
      const matchingColumns = group.columns.filter((col) =>
        col.col_name.toLowerCase().includes(inputText)
      );
      return {
        ...group,
        columns: matchingColumns,
      };
    })
    .filter((group) => group.columns.length > 0);
});

function ColumnPageProvider({ children, projectID, initialData }) {
  return h(
    ErrorBoundary,
    h(Provider, h(InitialStateProvider, { projectID, initialData }, children))
  );
}

function InitialStateProvider({ children, projectID, initialData }) {
  useHydrateAtoms([
    [projectIDAtom, projectID],
    [initialDataAtom, initialData],
  ]);
  return children;
}

export function Page({ title = "Columns", linkPrefix = "/" }) {
  const { project_id, allColumnGroups } = useData();
  return h(
    ColumnPageProvider,
    { projectID: project_id, initialData: allColumnGroups },
    h("div.column-list-page", [
      h(Suspense, [
        h(ContentPage, [
          h("div.flex-row", [
            h("div.main", [
              h("div", [
                h(PageBreadcrumbs, { showLogo: true }),
                h(FilterManager),
                h(LexFilters),
              ]),
              h(ColumnDataArea, { linkPrefix }),
            ]),
            h("div.sidebar", [
              h("div.sidebar-content", [
                h(ButtonGroup, { vertical: true, large: true }, [
                  h(
                    AnchorButton,
                    { href: "/projects", minimal: true },
                    "Projects"
                  ),
                  h(
                    DevLinkButton,
                    { href: "/columns/correlation" },
                    "Correlation chart"
                  ),
                ]),
                h(ColumnMapOuter, {
                  projectID: project_id,
                }),
              ]),
            ]),
          ]),
        ]),
        h(Footer),
      ]),
    ])
  );
}

function ColumnMapOuter({ projectID }) {
  const filteredGroups = useAtomValue(filteredGroupsAtom);

  const columnIDs = useMemo(() => {
    if (filteredGroups == null) return null;
    return filteredGroups.flatMap((item) =>
      item.columns.map((col) => col.col_id)
    );
  }, [filteredGroups]);

  return h(ColumnMapContainer, {
    columnIDs,
    projectID,
    className: "column-map-container",
  });
}

function ColumnDataArea({ linkPrefix }) {
  const showEmpty = useAtomValue(showEmptyAtom);
  const data = useAtomValue(filteredGroupsAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  return h(
    ContentArea,
    { isLoading },
    h(
      "div.column-groups",
      data.map((d) =>
        h(ColumnGroup, {
          data: d,
          key: d.id,
          linkPrefix,
          showEmpty,
        })
      )
    )
  );
}

function ContentArea({ isLoading, children }) {
  return h("div.content-area", [
    children,
    isLoading &&
      h("div.loading-overlay", [
        h(Spinner, { className: "loading-spinner", size: 50 }),
      ]),
  ]);
}

function FilterManager() {
  const [showEmpty, setShowEmpty] = useAtom(showEmptyAtom);
  const [showInProcess, setShowInProcess] = useAtom(showInProcessAtom);
  const [columnInput, setColumnInput] = useAtom(inputTextAtom);

  const suggestedFilters = useAtomValue(suggestedFiltersAtom) ?? [];

  return h("div.filters", [
    h(SearchBar, {
      placeholder: "Search columns...",
      onChange: setColumnInput,
      className: "search-bar",
      value: columnInput,
    }),
    h(
      Popover,
      {
        content: h(
          "div.suggested-items",
          suggestedFilters.map((d) =>
            h(LexCard, { data: d, key: d.type + d.lex_id })
          )
        ),
        isOpen: suggestedFilters.length > 0,
        position: "right",
        usePortal: false,
        autoFocus: false,
      },
      h("div")
    ),
    h("div.switches", [
      h(Switch, {
        checked: showEmpty,
        label: "Show empty",
        onChange: () => setShowEmpty(!showEmpty),
      }),
      h(Switch, {
        checked: showInProcess,
        label: "Show in process",
        onChange: () => setShowInProcess(!showInProcess),
      }),
    ]),
  ]);
}

function LexCard({ data }) {
  const addFilter = useSetAtom(addFilterAtom);

  const handleLexClick = (data: { type: string; lex_id: number }) => {
    const filterKey = filterKeyFromType(data.type);
    const obj = {
      type: filterKey,
      identifier: data.lex_id,
      name: data.name,
      color: data.color,
    };
    addFilter(obj);
  };

  return h(
    FlexRow,
    {
      alignItems: "center",
      width: "fit-content",
      gap: ".5em",
      className: "lith-tag",
      onClick: () => handleLexClick(data),
    },
    [
      h(LithologyTag, { data: { name: data.name, color: data.color } }),
      h("p.label", data.type),
    ]
  );
}

function ColumnGroup({ data, linkPrefix }) {
  const filteredColumns = data.columns;

  if (filteredColumns?.length === 0) return null;

  const { name } = data;
  return h("div.column-group", [
    h("div.column-group-header", [
      h(Link, { href: `/columns/groups/${data.id}`, target: "_self" }, [
        h(
          "h2.column-group-name",
          name + " (Group #" + filteredColumns[0].col_group_id + ")"
        ),
      ]),
    ]),
    h("div.column-list", [
      h("table.column-table", [
        h("thead.column-row.column-header", [
          h("tr", [
            h("th.col-id", "ID"),
            h("th.col-name", "Name"),
            h("th.col-status", "Status"),
          ]),
        ]),
        h("tbody", [
          filteredColumns.map((data) => h(ColumnItem, { data, linkPrefix })),
        ]),
      ]),
    ]),
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name, t_units, t_sections } = data;

  const unitsText = t_units > 0 ? `${t_units} units` : "no units";

  let gbpTag = null;
  if (t_sections > 0) {
    gbpTag = h(
      Tag,
      { minimal: true, color: "goldenrod", size: "small" },
      `${t_sections} packages`
    );
  }

  const href = linkPrefix + `columns/${col_id}`;
  return h(
    "tr.column-row",
    {
      onClick() {
        navigate(href);
      },
    },
    [
      h("td.col-id", h("code.bp5-code", col_id)),
      h("td.col-name", h("a", { href }, col_name)),
      h("td.col-status", [
        data.status_code === "in process" &&
          h(
            Tag,
            { minimal: true, color: "lightgreen", size: "small" },
            "in process"
          ),
        gbpTag,
        h(
          Tag,
          {
            minimal: true,
            size: "small",
            color: t_units == 0 ? "orange" : "dodgerblue",
          },
          unitsText
        ),
      ]),
    ]
  );
}

function LexFilters() {
  const filters = useAtomValue(columnFilterAtom);
  if (filters.length == 0) return null;
  return h("div.lex-filters", [
    h(
      FlexRow,
      {
        align: "center",
        gap: ".5em",
      },
      [
        h("p.filter", "Filtering columns by "),
        ...filters.map((filter) =>
          h(ColumnFilterItem, {
            data: {
              ...filter,
              lex_id: filter.identifier,
            },
            key: filter.type + filter.identifier,
          })
        ),
      ]
    ),
  ]);
}

async function _fetchFilterItems(inputText: string) {
  // Fetch filter items from the API based on input text, using the PostgREST client API
  const res = postgrest
    .from("col_filters")
    .select("*")
    .ilike("name", `%${inputText}%`)
    .limit(5);

  // Todo: add error handling
  const { data, error } = await res;
  return data ?? [];
}

const fetchFilterItems = debounce(_fetchFilterItems, 300);

const clearAllFiltersAtom = atom(null, (get, set) => {
  set(columnFilterAtom, []);
});

function ColumnFilterItem({ data }: { data: ColumnFilterDef }) {
  const { type, identifier } = data;
  const route = routeForFilterKey(type);
  const clearAllFilters = useSetAtom(clearAllFiltersAtom);
  return h("div.lex-filter-item", [
    h(LithologyTag, {
      href: `/lex/${route}/${identifier}`,
      data,
    }),
    h(Icon, {
      className: "close-btn",
      icon: "cross",
      onClick: clearAllFilters,
    }),
  ]);
}

function routeForFilterKey(key: ColumnFilterKey): string {
  switch (key) {
    case "liths":
      return "lithologies";
    case "stratNames":
      return "strat-names";
    case "intervals":
      return "intervals";
    case "concepts":
      return "concepts";
    case "environments":
      return "environments";
  }
}

function filterKeyFromType(type: string): ColumnFilterKey | null {
  switch (type) {
    case "lithology":
      return "liths";
    case "strat name":
      return "stratNames";
    case "interval":
      return "intervals";
    case "concept":
      return "concepts";
    case "environment":
      return "environments";
    default:
      return null;
  }
}

function paramNameForFilterKey(
  key: ColumnFilterKey
): keyof ColumnFilterOptions {
  switch (key) {
    case "liths":
      return "liths";
    case "stratNames":
      return "strat_names";
    case "intervals":
      return "intervals";
    case "concepts":
      return "strat_name_concepts";
    case "environments":
      return "environments";
  }
}

function buildParamsFromFilters(
  filters: ColumnFilterDef[]
): Partial<ColumnFilterOptions> {
  const params: Record<string, string> = {};
  if (filters == null) return params;
  let filterData: Partial<ColumnFilterOptions> = {};
  for (const filter of filters) {
    const key = paramNameForFilterKey(filter.type);
    if (key == "strat_names" || key == "strat_name_concepts") {
      // We can add multiple parameters of each type
      filterData[key] ??= [];
    } else {
      filterData[key] = [];
    }
    filterData[key].push(filter.identifier);
  }
  return filterData;
}

async function instrumentResult<T>(
  promise: Promise<T>
): Promise<{ data: T | null; error: any | null; loading: boolean }> {
  try {
    return {
      data: await promise,
      error: null,
      loading: false,
    };
  } catch (e) {
    return {
      data: null,
      error: e,
      loading: false,
    };
  }
}
