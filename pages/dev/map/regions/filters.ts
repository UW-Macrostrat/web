/** Filters for the region list: row-local predicates over the in-memory set,
 * which the map restates as a style filter (see `mapFilterAtom`). */

import { HTMLSelect, InputGroup } from "@blueprintjs/core";
import type { TableFilter } from "@macrostrat/data-sheet";
import { useAtomValue } from "jotai";
import type { FilterURLBinding } from "~/components";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import type { Region } from "./api";
import { regionClassesAtom, sourcesAtom } from "./state";

const h = hyper.styled(styles);

/* ------------------------------------------------------------------ search */

interface SearchState {
  text: string;
}

function SearchForm({ state, setState }) {
  return h(InputGroup, {
    className: "search-input",
    large: true,
    leftIcon: "search",
    placeholder: "Search regions by name, group, type or ID…",
    value: state?.text ?? "",
    onChange: (evt) => {
      const text = evt.currentTarget.value;
      if (text === "") {
        setState(null);
      } else {
        setState({ text });
      }
    },
  });
}

export const searchFilter: TableFilter<Region, SearchState> = {
  id: "region-search",
  name: "Search",
  icon: "search",
  defaultState: { text: "" },
  presentation: "inline",
  filterForm: SearchForm,
  describeState: (s) => {
    const text = (s?.text ?? "").trim();
    if (text === "") return null;
    return text;
  },
  predicate: (row, s) => {
    const query = (s?.text ?? "").trim().toLowerCase();
    if (query === "") return true;
    const fields = [
      row.name,
      row.region_group,
      row.region_type,
      String(row.region_id),
    ];
    return fields.some((value) => value?.toLowerCase().includes(query));
  },
};

/* ------------------------------------------------------------------ source */

interface SourceState {
  source_id: number;
}

function SourceForm({ state, setState }) {
  const sources = useAtomValue(sourcesAtom);

  const onChange = (evt) => {
    const next = Number.parseInt(evt.currentTarget.value);
    if (Number.isNaN(next)) {
      setState(null);
    } else {
      setState({ source_id: next });
    }
  };

  return h(
    HTMLSelect,
    {
      className: "source-select",
      value: state?.source_id?.toString() ?? "",
      onChange,
    },
    [
      h("option", { key: "any", value: "" }, "Any"),
      ...sources.map((s) =>
        h(
          "option",
          { key: s.source_id, value: s.source_id },
          `${s.name ?? s.source_id} (${s.n_regions ?? 0})`
        )
      ),
    ]
  );
}

export const sourceFilter: TableFilter<Region, SourceState> = {
  id: "region-source",
  name: "Source",
  icon: "database",
  presentation: "menu-inline",
  filterForm: SourceForm,
  describeState: (s) => s?.source_id?.toString() ?? null,
  predicate: (row, s) => s == null || row.source_id === s.source_id,
};

/* ------------------------------------------------------------------- class */

interface ClassState {
  value: string;
}

function ClassForm({ state, setState }) {
  const classes = useAtomValue(regionClassesAtom);

  const onChange = (evt) => {
    const value = evt.currentTarget.value;
    if (value === "") {
      setState(null);
    } else {
      setState({ value });
    }
  };

  return h(HTMLSelect, { value: state?.value ?? "", onChange }, [
    h("option", { key: "any", value: "" }, "Any"),
    ...classes.map((value) => h("option", { key: value, value }, value)),
  ]);
}

export const classFilter: TableFilter<Region, ClassState> = {
  id: "region-class",
  name: "Class",
  icon: "tag",
  presentation: "menu-inline",
  filterForm: ClassForm,
  describeState: (s) => s?.value ?? null,
  predicate: (row, s) => s == null || row.region_class === s.value,
};

export const regionFilters = [searchFilter, sourceFilter, classFilter];

/* --------------------------------------------------------------------- URL */

export const regionURLBindings: FilterURLBinding[] = [
  {
    filter: searchFilter,
    params: ["q"],
    toParams: (s: SearchState) => ({ q: s?.text?.trim() || null }),
    fromParams: ({ q }) => {
      if (q == null || q.trim() === "") return null;
      return { text: q };
    },
  },
  {
    filter: sourceFilter,
    params: ["source"],
    toParams: (s: SourceState) => ({
      source: s?.source_id?.toString() ?? null,
    }),
    fromParams: ({ source }) => {
      const source_id = Number.parseInt(source ?? "");
      if (Number.isNaN(source_id)) return null;
      return { source_id };
    },
  },
  {
    filter: classFilter,
    params: ["class"],
    toParams: (s: ClassState) => ({ class: s?.value ?? null }),
    fromParams: (values) => {
      const value = values["class"];
      if (value == null || value === "") return null;
      return { value };
    },
  },
];
