/** Time filter UI: a compact, clearable tag showing the active age window, and
 * a panel for refining it by age or by interval. Both read the ambient filter
 * from `TimeFilterProvider`, so a page mounts them wherever its chrome allows
 * and wires nothing else. */
import { hyperStyled } from "@macrostrat/hyper";
import { ReactNode, useEffect, useState } from "react";
import {
  Button,
  ControlGroup,
  FormGroup,
  NumericInput,
} from "@blueprintjs/core";
import {
  IntervalTag,
  Tag,
  TagSize,
  useInteractionProps,
  type IntervalShort,
} from "@macrostrat/data-components";
import { AgeRange, type AgeWindow } from "@macrostrat/column-views";
import {
  Timescale,
  TimescaleOrientation,
  useMacrostratIntervals,
  type Interval,
  type TimescaleClickData,
} from "@macrostrat/timescale";
import { useMacrostratBaseURL } from "@macrostrat/data-provider";
import {
  intervalShortFromTimescale,
  useResolvedTimeFilter,
  useTimeFilter,
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
 * with its age range, or the bare age range. Renders nothing when no filter is
 * set, so it can sit permanently in page chrome without adding weight. */
export function TimeFilterTag(props: TimeFilterTagProps) {
  const { className, size = TagSize.Small, clearable = true } = props;
  const { filter, clear } = useTimeFilter();
  const resolved = useResolvedTimeFilter();
  if (filter == null || resolved == null) return null;

  const { interval, window, isRefined } = resolved;

  let tag: ReactNode;
  if (interval == null && filter.int_id != null) {
    tag = h(Tag, { size, name: `Interval ${filter.int_id}` });
  } else if (interval == null) {
    tag = h(Tag, { size, name: h(AgeRangeLabel, { window }) });
  } else if (isRefined) {
    tag = h(RefinedIntervalTag, { interval, window, size });
  } else {
    tag = h(IntervalTag, { interval, showAgeRange: true, size });
  }

  return h("span.time-filter-tag", { className }, [
    tag,
    h.if(clearable)(Button, {
      className: "clear-button",
      icon: "cross",
      minimal: true,
      small: true,
      title: "Clear time filter",
      onClick: clear,
    }),
  ]);
}

function RefinedIntervalTag({
  interval,
  window,
  size,
}: {
  interval: IntervalShort;
  window: AgeWindow | null;
  size: TagSize;
}) {
  const interaction = useInteractionProps({ int_id: interval.id });
  return h(Tag, {
    ...interaction,
    size,
    name: interval.name,
    color: interval.color,
    details: h(AgeRangeLabel, { window }),
  });
}

function AgeRangeLabel({ window }: { window: AgeWindow | null }) {
  if (window == null) return null;
  if (!Number.isFinite(window.b_age)) {
    // Only a younger bound was given
    return h("span.age-range", `younger than ${window.t_age} Ma`);
  }
  return h(AgeRange, { data: window });
}

export interface TimeFilterPanelProps {
  className?: string;
  /** Show the clickable interval picker (default true). */
  showIntervalPicker?: boolean;
  /** Pixel length of the interval picker timescale. */
  pickerLength?: number;
}

/** Settings-style panel: direct `t_age`/`b_age` inputs plus a clickable
 * timescale for setting the filter by interval. */
export function TimeFilterPanel(props: TimeFilterPanelProps) {
  const { className, showIntervalPicker = true, pickerLength = 320 } = props;
  return h("div.time-filter-panel", { className }, [
    h(AgeRangeControl),
    h.if(showIntervalPicker)(IntervalPicker, { length: pickerLength }),
  ]);
}

function AgeRangeControl() {
  const { filter, setFilter, clear } = useTimeFilter();
  const resolved = useResolvedTimeFilter();
  const interval = resolved?.interval ?? null;

  // Explicit ages are shown as values; an interval's own span as placeholders.
  const commit = (key: "t_age" | "b_age", value: number | null) => {
    const next = { ...(filter ?? {}) };
    if (value == null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setFilter(next);
  };

  const label = h("span", ["Age range ", h("span.unit", "(Ma)")]);

  return h(
    FormGroup,
    { label, className: "age-range-control" },
    h(ControlGroup, { fill: true }, [
      h(CommittedNumericInput, {
        value: filter?.b_age ?? null,
        placeholder: interval?.b_age?.toString() ?? "Bottom",
        onCommit: (v) => commit("b_age", v),
      }),
      h(CommittedNumericInput, {
        value: filter?.t_age ?? null,
        placeholder: interval?.t_age?.toString() ?? "Top",
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

/** A numeric input that applies its value on blur or Enter rather than on
 * every keystroke, so a half-typed age doesn't drive the column around. */
function CommittedNumericInput({
  value,
  placeholder,
  onCommit,
}: {
  value: number | null;
  placeholder?: string;
  onCommit(value: number | null): void;
}) {
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
    value: draft,
    placeholder,
    buttonPosition: "none",
    onValueChange: (_num, str) => setDraft(str),
    onBlur: commit,
    onKeyDown: (evt) => {
      if (evt.key === "Enter") commit();
    },
  });
}

function IntervalPicker({ length }: { length: number }) {
  const baseURL = useMacrostratBaseURL();
  const intervals = useMacrostratIntervals({ baseURL });
  const { filter, selectInterval } = useTimeFilter();
  const selectedID = filter?.int_id ?? null;

  if (intervals == null || intervals.length === 0) return null;

  const onClick = (_evt: Event, data: TimescaleClickData) => {
    if (data?.interval == null) return;
    selectInterval(intervalShortFromTimescale(data.interval));
  };

  const intervalStyle = (interval: Interval) => {
    if (
      selectedID != null &&
      (interval.int_id ?? interval.oid) === selectedID
    ) {
      return { fontWeight: "bold" };
    }
    return {};
  };

  return h("div.interval-picker", [
    h(Timescale, {
      intervals,
      orientation: TimescaleOrientation.HORIZONTAL,
      levels: [1, 3],
      length,
      absoluteAgeScale: false,
      showAgeAxis: false,
      onClick,
      intervalStyle,
    }),
  ]);
}
