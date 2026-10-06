import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useEffect, useRef, useState } from "react";
import { useData } from "vike-react/useData";
import { InputGroup, RangeSlider } from "@blueprintjs/core";
import {
  createLocalProvider,
  DataPanel,
  DataPanelToolbarStyle,
  SelectionInteractionStyle,
  type ColumnSpec,
  type ScrollBodyProps,
  type TableFilter,
} from "@macrostrat/data-sheet";
import { HybridContentFooter, HybridPage } from "~/layouts/hybrid";
import { LinkCard } from "~/components/cards";
import { capitalizeWords } from "~/components/lex/timescale-data";

const h = hyper.styled(styles);

interface TimescaleRow {
  timescale_id: number;
  timescale: string;
  max_age: number;
  min_age: number;
  n_intervals: number;
}

const OLDEST_AGE = 4600;

const searchFilter: TableFilter<TimescaleRow, { value: string }> = {
  id: "timescale-search",
  name: "Search",
  icon: "search",
  defaultState: { value: "" },
  describeState: (s) => s?.value || null,
  presentation: "inline",
  filterForm: SearchInput,
  predicate: (row, s) => {
    const q = (s?.value ?? "").trim().toLowerCase();
    return row.timescale?.toLowerCase().includes(q) ?? false;
  },
};

const ageFilter: TableFilter<TimescaleRow, { range: [number, number] }> = {
  id: "timescale-age",
  name: "Age range",
  icon: "time",
  defaultState: { range: [0, OLDEST_AGE] },
  describeState: (s) => `${s.range[1]}–${s.range[0]} Ma`,
  filterForm: AgeRangeInput,
  // Any overlap with the range, not containment
  predicate: (row, s) => {
    const [younger, older] = s.range;
    return row.max_age >= younger && row.min_age <= older;
  },
};

const listFilters = [searchFilter, ageFilter];

const columnSpec: ColumnSpec[] = [
  { key: "timescale", name: "Name", sortable: true },
  { key: "max_age", name: "Oldest age", sortable: true },
  { key: "n_intervals", name: "Intervals", sortable: true },
];

const capabilities = {
  modes: ["content-only" as const],
  defaultMode: "content-only" as const,
  hasAssistant: false,
  itemName: "Timescales",
  contentScroll: "panel" as const,
};

export function Page() {
  const { res } = useData<{ res: TimescaleRow[] }>();
  const [provider] = useState(() =>
    createLocalProvider(res, { identity: (row) => row.timescale_id })
  );

  return h(HybridPage, {
    className: "timescale-list-page",
    capabilities,
    content: h(DataPanel<TimescaleRow>, {
      className: "timescale-panel",
      name: "Timescales",
      itemLabel: "timescale",
      provider,
      columnSpec,
      filters: listFilters,
      initialData: { rows: res, totalCount: res.length },
      // The whole list in one page: there are a few dozen timescales
      pageSize: 100,
      itemComponent: TimescaleCard,
      scrollBody: TimescaleGrid,
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      enableSelection: SelectionInteractionStyle.NEVER,
      contentFooter: h(HybridContentFooter),
    }),
  });
}

function TimescaleGrid({ children, placeholders }: ScrollBodyProps) {
  return h("div.timescale-grid", [children, placeholders]);
}

function TimescaleCard({ data }: { data: TimescaleRow }) {
  const { timescale, min_age, max_age, n_intervals, timescale_id } = data;
  return h(
    LinkCard,
    {
      className: "timescale-card",
      density: "list",
      href: "/lex/timescales/" + timescale_id,
      title: capitalizeWords(timescale),
    },
    h("p.timescale-summary", `${max_age}–${min_age} Ma · ${n_intervals} intervals`)
  );
}

/** Locally controlled, committing on a short delay, as on the strat-names list:
 * a commit per keystroke would reset the view under the typing. */
function SearchInput({ state, setState }) {
  const committed = state?.value ?? "";
  const [text, setText] = useState(committed);

  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current != null && pending.current !== committed) return;
    pending.current = null;
    setText(committed);
  }, [committed]);

  useEffect(() => {
    if (text === committed) return;
    pending.current = text;
    const handle = setTimeout(() => setState({ value: text }), 150);
    return () => clearTimeout(handle);
  }, [text, committed, setState]);

  return h(InputGroup, {
    className: "timescale-search-input",
    leftIcon: "search",
    placeholder: "Search timescales…",
    value: text,
    onValueChange: setText,
  });
}

function AgeRangeInput({ state, setState }) {
  const range = state?.range ?? ageFilter.defaultState.range;
  return h("div.age-range-input", [
    h(RangeSlider, {
      min: 0,
      max: OLDEST_AGE,
      stepSize: 10,
      labelStepSize: 1000,
      value: range,
      onChange: (value) => setState({ range: value }),
    }),
  ]);
}
