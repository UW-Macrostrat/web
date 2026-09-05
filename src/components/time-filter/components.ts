/** Time filter UI: a compact, clearable tag showing the active age window, and
 * a panel for refining it by age or by interval. Both read the ambient filter
 * from `TimeFilterProvider`, so a page mounts them wherever its chrome allows
 * and wires nothing else. */
import { hyperStyled } from "@macrostrat/hyper";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Button,
  ControlGroup,
  FormGroup,
  MenuItem,
  NumericInput,
  type NumericInputProps,
} from "@blueprintjs/core";
import {
  Suggest,
  type ItemListPredicate,
  type ItemRenderer,
} from "@blueprintjs/select";
import { Tag, TagSize, type IntervalShort } from "@macrostrat/data-components";
import { AgeRange, AgeWindowTag, type AgeWindow } from "@macrostrat/column-views";
import {
  Timescale,
  TimescaleOrientation,
  useMacrostratIntervals,
} from "@macrostrat/timescale";
import {
  useMacrostratBaseURL,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import type { MacrostratInterval } from "@macrostrat/api-types";
import {
  intervalShortFromDefinition,
  useResolvedTimeFilter,
  useTimeFilter,
  useTimescaleIntervalInteraction,
} from "./state";
import styles from "./main.module.sass";

const h = hyperStyled(styles);

export interface TimeFilterTagProps {
  className?: string;
  size?: TagSize;
  /** Show the clear button (default true). */
  clearable?: boolean;
}

/** The active time filter as a tag: the interval (linked to its lexicon page)
 * with its age range, a range of intervals, a single age, or the bare age
 * range. Renders nothing when no filter is set, so it can sit permanently in
 * page chrome without adding weight.
 *
 * A single interval or an age range renders through `AgeWindowTag` from
 * `@macrostrat/column-views`; the other cases (an id still resolving, an
 * interval range, a single age, an open older bound) are site-side. */
export function TimeFilterTag(props: TimeFilterTagProps) {
  const { className, size = TagSize.Small, clearable = true } = props;
  const { filter, clear } = useTimeFilter();
  const resolved = useResolvedTimeFilter();
  if (filter == null || resolved == null) return null;

  const { kind, interval, intervalRange, window } = resolved;

  let onClear: (() => void) | undefined = undefined;
  if (clearable) {
    onClear = clear;
  }

  let content: ReactNode;
  if (kind === "interval" && interval == null && intervalRange == null) {
    // Definitions still loading
    content = h(Tag, { size, name: "Interval…" });
  } else if (intervalRange != null) {
    content = h(Tag, {
      size,
      name: `${intervalRange.bottom.name} – ${intervalRange.top.name}`,
      details: h(AgeRange, { data: window }),
    });
  } else if (kind === "age") {
    content = h(Tag, { size, name: `${filter.age} Ma` });
  } else if (
    kind === "age-range" &&
    window != null &&
    !Number.isFinite(window.b_age)
  ) {
    content = h(Tag, { size, name: `younger than ${window.t_age} Ma` });
  } else {
    return h(
      "span.time-filter-tag",
      { className },
      h(AgeWindowTag, { interval, window, onClear, size })
    );
  }

  return h("span.time-filter-tag", { className }, [
    content,
    h.if(clearable)(ClearButton, { onClick: clear }),
  ]);
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return h(Button, {
    className: "clear-button",
    icon: "cross",
    minimal: true,
    small: true,
    title: "Clear time filter",
    onClick,
  });
}

export interface TimeFilterPanelProps {
  className?: string;
  /** Show the interval name search (default true). */
  showIntervalSearch?: boolean;
  /** Show the clickable interval picker (default true). */
  showIntervalPicker?: boolean;
  /** Pixel length of the interval picker timescale. Longer than its container
   * is fine — the picker scrolls horizontally. */
  pickerLength?: number;
}

/** Settings-style panel: direct `t_age`/`b_age` inputs, an interval name
 * search, and a clickable timescale for setting the filter by interval. */
export function TimeFilterPanel(props: TimeFilterPanelProps) {
  const {
    className,
    showIntervalSearch = true,
    showIntervalPicker = true,
    pickerLength = 640,
  } = props;
  return h("div.time-filter-panel", { className }, [
    h(AgeRangeControl),
    h.if(showIntervalSearch)(IntervalSearch),
    h.if(showIntervalPicker)(IntervalPicker, { length: pickerLength }),
  ]);
}

/** Explicit age bounds. Typing an age switches to an age selection (dropping
 * any interval); an interval's own span shows as placeholders meanwhile. */
function AgeRangeControl() {
  const { filter, kind, setAgeRange, clear } = useTimeFilter();
  const resolved = useResolvedTimeFilter();

  let placeholderBottom = "Bottom";
  let placeholderTop = "Top";
  if (kind === "interval" && resolved?.window != null) {
    placeholderBottom = resolved.window.b_age.toString();
    placeholderTop = resolved.window.t_age.toString();
  }

  let b_age: number | null = null;
  let t_age: number | null = null;
  if (kind === "age-range") {
    b_age = filter?.b_age ?? null;
    t_age = filter?.t_age ?? null;
  }

  const commit = (key: "t_age" | "b_age", value: number | null) => {
    const next = { t_age, b_age, [key]: value };
    setAgeRange(next);
  };

  const label = h("span", ["Age range ", h("span.unit", "(Ma)")]);

  return h(
    FormGroup,
    { label, className: "age-range-control" },
    h(ControlGroup, { fill: true }, [
      h(CommittedNumericInput, {
        value: b_age,
        placeholder: placeholderBottom,
        onCommit: (v) => commit("b_age", v),
      }),
      h(CommittedNumericInput, {
        value: t_age,
        placeholder: placeholderTop,
        onCommit: (v) => commit("t_age", v),
      }),
      h(Button, {
        icon: "cross",
        minimal: true,
        small: true,
        title: "Clear time filter",
        disabled: filter == null,
        onClick: clear,
      }),
    ])
  );
}

export interface CommittedNumericInputProps
  extends Omit<NumericInputProps, "value" | "onValueChange"> {
  value: number | null;
  onCommit(value: number | null): void;
}

/** A numeric input that applies its value on blur or Enter rather than on
 * every keystroke — so a half-typed age doesn't drive the column around, and
 * decimals can be typed at all (a controlled number would reject "0."). */
export function CommittedNumericInput({
  value,
  onCommit,
  ...rest
}: CommittedNumericInputProps) {
  const [draft, setDraft] = useState<string>(value?.toString() ?? "");
  useEffect(() => {
    setDraft(value?.toString() ?? "");
  }, [value]);

  const commit = () => {
    if (draft.trim() === "") {
      if (value != null) onCommit(null);
      return;
    }
    const num = parseFloat(draft);
    if (!Number.isFinite(num) || num === value) return;
    onCommit(num);
  };

  return h(NumericInput, {
    buttonPosition: "none",
    ...rest,
    value: draft,
    onValueChange: (_num, str) => setDraft(str),
    onBlur: commit,
    onKeyDown: (evt) => {
      if (evt.key === "Enter") commit();
    },
  });
}

/* -------------------------------------------------------- interval search */

/** The API's interval definition, as held by the `MacrostratDataProvider`
 * store (`useMacrostratDefs("intervals")`). */
interface IntervalDef extends MacrostratInterval {
  abbrev?: string;
}

/** Most matches shown at once. Substring search over ~1000 intervals is cheap;
 * the cap keeps the menu readable, since narrowing the query is quicker than
 * scrolling it. */
const MAX_SEARCH_RESULTS = 25;

/** Type-ahead over every Macrostrat interval by name (or exact abbreviation),
 * in the manner of the lexicon pages' search. Selecting one sets the filter to
 * its full span. */
function IntervalSearch() {
  const defs = useMacrostratDefs("intervals") as Map<number, IntervalDef> | null;
  const { filter, selectInterval } = useTimeFilter();

  const items = useMemo(() => {
    if (defs == null) return [];
    return Array.from(defs.values()).filter((d) => d?.name != null);
  }, [defs]);

  let selectedItem: IntervalDef | null = null;
  if (filter?.int_id != null) {
    selectedItem = defs?.get(filter.int_id) ?? null;
  }

  return h(
    FormGroup,
    { label: "Interval", className: "interval-search" },
    h(Suggest<IntervalDef>, {
      items,
      selectedItem,
      itemListPredicate: filterIntervals,
      itemRenderer: renderInterval,
      inputValueRenderer: (d) => d.name,
      onItemSelect: (d) => selectInterval(intervalShortFromDefinition(d)),
      noResults: h(MenuItem, {
        disabled: true,
        text: "No matching intervals",
        roleStructure: "listoption",
      }),
      resetOnClose: true,
      fill: true,
      popoverProps: { minimal: true, matchTargetWidth: true },
      inputProps: {
        placeholder: "Search intervals by name…",
        leftIcon: "search",
      },
    })
  );
}

const filterIntervals: ItemListPredicate<IntervalDef> = (query, items) => {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const startsWith: IntervalDef[] = [];
  const contains: IntervalDef[] = [];
  for (const d of items) {
    const name = d.name.toLowerCase();
    if (name.startsWith(q)) {
      startsWith.push(d);
    } else if (name.includes(q) || d.abbrev?.toLowerCase() === q) {
      contains.push(d);
    }
  }
  return [...startsWith, ...contains].slice(0, MAX_SEARCH_RESULTS);
};

const renderInterval: ItemRenderer<IntervalDef> = (
  d,
  { handleClick, handleFocus, modifiers }
) => {
  if (!modifiers.matchesPredicate) return null;
  return h(MenuItem, {
    key: d.int_id,
    text: d.name,
    label: `${formatAge(d.b_age)}–${formatAge(d.t_age)} Ma`,
    icon: h("span.interval-swatch", {
      style: { backgroundColor: d.color ?? "#888" },
    }),
    active: modifiers.active,
    disabled: modifiers.disabled,
    onClick: handleClick,
    onFocus: handleFocus,
    roleStructure: "listoption",
  });
};

function formatAge(age: number): string {
  if (age == null) return "?";
  if (age === 0) return "0";
  if (age < 1) return age.toPrecision(2);
  return String(Math.round(age * 10) / 10);
}

/* -------------------------------------------------------- interval picker */

/** A horizontal timescale to click intervals on — the same navigation as a
 * column's own timescale (click, re-click to step out, shift-click for a
 * range), for pages whose main view has no timescale of its own. */
function IntervalPicker({ length }: { length: number }) {
  const baseURL = useMacrostratBaseURL();
  const intervals = useMacrostratIntervals({ baseURL });
  const { onClickTimescaleInterval, timescaleIntervalStyle } =
    useTimescaleIntervalInteraction();

  if (intervals == null || intervals.length === 0) return null;

  // Scrolls horizontally inside the panel: the timescale is laid out at its
  // full `length` so period-level labels stay legible.
  return h("div.interval-picker", [
    h(Timescale, {
      intervals,
      orientation: TimescaleOrientation.HORIZONTAL,
      levels: [1, 3],
      length,
      absoluteAgeScale: false,
      showAgeAxis: false,
      onClick: onClickTimescaleInterval,
      intervalStyle: timescaleIntervalStyle,
    }),
  ]);
}

export type { IntervalShort, AgeWindow };
