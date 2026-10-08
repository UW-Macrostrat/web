/** Filters for the map list. All are row-local predicates over the in-memory
 * set, so the list and the map apply one definition of each. */

import { HTMLSelect, InputGroup, SegmentedControl } from "@blueprintjs/core";
import type { TableFilter } from "@macrostrat/data-sheet";
import { useAtomValue } from "jotai";
import type { FilterURLBinding } from "~/components";
import { scaleOrder } from "~/components/compilation-tree";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import type { MapRow } from "./compilations";
import { compilationsAtom } from "./state";

const h = hyper.styled(styles);

export const SEARCH_FILTER_ID = "map-search";

/* ------------------------------------------------------------------ search */

interface SearchState {
  text: string;
}

function SearchForm({ state, setState }) {
  return h(InputGroup, {
    className: "search-input",
    large: true,
    leftIcon: "search",
    placeholder: "Search maps by name, slug, source or ID…",
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

export const searchFilter: TableFilter<MapRow, SearchState> = {
  id: SEARCH_FILTER_ID,
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
    const fields = [row.name, row.slug, row.ref_source, String(row.source_id)];
    return fields.some((value) => value?.toLowerCase().includes(query));
  },
};

/* ------------------------------------------------------------------- scale */

interface ScaleState {
  value: string | null;
}

export const scaleFilter: TableFilter<MapRow, ScaleState> = {
  id: "map-scale",
  name: "Scale",
  icon: "zoom-to-fit",
  defaultState: { value: null },
  presentation: "menu-inline",
  describeState: (s) => s?.value ?? null,
  predicate: (row, s) => s?.value == null || row.scale === s.value,
  filterForm: ({ state, setState }) =>
    h(SegmentedControl, {
      small: true,
      options: scaleOrder.map((value) => ({ label: value, value })),
      value: state?.value ?? "",
      onValueChange: (value: string) => setState({ value }),
    }),
};

/* ------------------------------------------------------------- compilation */

/** A compilation by slug, or `none` for maps no compilation has taken in. */
type CompilationState = { slug: string } | { none: true };

const NONE = "none";

function CompilationForm({ state, setState }) {
  const compilations = useAtomValue(compilationsAtom);
  const served = compilations.filter((c) => c.is_served);
  const internal = compilations.filter((c) => !c.is_served);

  let value = "";
  if (state?.none) value = NONE;
  if (state?.slug != null) value = state.slug;

  const onChange = (evt) => {
    const next = evt.currentTarget.value;
    if (next === "") {
      setState(null);
    } else if (next === NONE) {
      setState({ none: true });
    } else {
      setState({ slug: next });
    }
  };

  return h(HTMLSelect, { className: "compilation-select", value, onChange }, [
    h("option", { value: "" }, "Any"),
    h("option", { value: NONE }, "Not in a compilation"),
    h(CompilationGroup, { label: "Served", compilations: served }),
    h(CompilationGroup, { label: "Building blocks", compilations: internal }),
  ]);
}

function CompilationGroup({ label, compilations }) {
  if (compilations.length === 0) return null;
  return h(
    "optgroup",
    { label },
    compilations.map((c) =>
      h("option", { key: c.slug, value: c.slug }, `${c.name} (${c.n_maps})`)
    )
  );
}

export const compilationFilter: TableFilter<MapRow, CompilationState> = {
  id: "map-compilation",
  name: "Compilation",
  icon: "layers",
  presentation: "menu-inline",
  filterForm: CompilationForm,
  describeState: (s) => {
    if (s == null) return null;
    if ("none" in s) return "none";
    return s.slug;
  },
  predicate: (row, s) => {
    if (s == null) return true;
    if ("none" in s) return row.compilations.length === 0;
    return row.compilations.includes(s.slug);
  },
};

/* --------------------------------------------------------------------- URL */

export const mapURLBindings: FilterURLBinding[] = [
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
    filter: scaleFilter,
    params: ["scale"],
    toParams: (s: ScaleState) => ({ scale: s?.value ?? null }),
    fromParams: ({ scale }) => {
      if (!scaleOrder.includes(scale)) return null;
      return { value: scale };
    },
  },
  {
    filter: compilationFilter,
    params: ["compilation"],
    toParams: (s: CompilationState) => {
      if (s == null) return { compilation: null };
      if ("none" in s) return { compilation: NONE };
      return { compilation: s.slug };
    },
    fromParams: ({ compilation }) => {
      if (compilation == null || compilation === "") return null;
      if (compilation === NONE) return { none: true };
      return { slug: compilation };
    },
  },
];
