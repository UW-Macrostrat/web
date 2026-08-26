/**
 * Interval selection for polygon `t_interval` / `b_interval` columns.
 *
 * Two pieces plug into data-sheet's column spec:
 *  - `IntervalCell` (`cellComponent`): renders the colored interval name for a
 *    stored `int_id` when displaying; defers to the editor's children when the
 *    cell is being edited.
 *  - `IntervalEditor` (`dataEditor`): a searchable interval list shown inside
 *    data-sheet's `EditorPopup` popover; selecting one commits the `int_id`.
 *
 * Interval reference data is loaded once into `intervalsAtom` by
 * `useLoadIntervals` (called from the polygons wrapper).
 */
import { Cell } from "@blueprintjs/table";
import { Button, InputGroup, Menu, MenuItem } from "@blueprintjs/core";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInDarkMode } from "@macrostrat/ui-components";
import { getColorPair } from "@macrostrat/color-utils";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Interval } from "../components";
import { intervalsAtom } from "./state";
import h from "../hyper";

/** Cap the rendered list for responsiveness while typing. */
const MAX_RESULTS = 10;

function findInterval(intervals: Interval[], value: any): Interval | null {
  if (value == null || value === "") return null;
  const id = parseInt(value);
  return intervals.find((iv) => iv.int_id === id) ?? null;
}

/** `valueRenderer` for interval columns: show the interval *name* (not the raw
 * `int_id`) wherever data-sheet renders the plain value (e.g. the focused-cell
 * editor's value viewer). Also avoids the default numeric renderer's
 * `toFixed` crash on edited string values. Reads the default jotai store, so
 * usable outside a component. */
export function renderIntervalName(value: any): string {
  if (value == null || value === "") return "";
  const intervals = getDefaultStore().get(intervalsAtom);
  return findInterval(intervals, value)?.name ?? String(value);
}

/** Fetch interval definitions once and publish them to `intervalsAtom`. */
export function useLoadIntervals() {
  const setIntervals = useSetAtom(intervalsAtom);
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`${apiV2Prefix}/defs/intervals?all`);
      if (!res.ok) return;
      const body = await res.json();
      const data: Interval[] = body.success.data;
      // Prefer intervals defined across more timescales (broadly useful first).
      data.sort((a, b) => b.timescales.length - a.timescales.length);
      if (active) setIntervals(data);
    })();
    return () => {
      active = false;
    };
  }, [setIntervals]);
}

/** Cell renderer: colored interval name when displaying, editor when editing. */
export function IntervalCell({ value, children, interactive, style, ...rest }) {
  const intervals = useAtomValue(intervalsAtom);
  const inDarkMode = useInDarkMode();
  const interval = findInterval(intervals, value);

  const colors = useMemo(() => {
    return interval != null ? getColorPair(interval.color, inDarkMode) : null;
  }, [interval, inDarkMode]);

  // While editing, data-sheet passes the popover editor as `children`.
  if (interactive) {
    console.log(interactive, value, children, style);
    return h(Cell, { interactive, style, ...rest }, children);
  }

  const content =
    interval?.name ?? (value == null || value === "" ? null : String(value));

  return h(
    Cell,
    {
      interactive,
      style: colors != null ? { ...style, ...colors } : style,
      ...rest,
    },
    content
  );
}

/** Popover editor: searchable, keyboard-navigable interval list.
 *
 * ArrowUp/Down move the active item, Enter commits it, and Escape is left to
 * bubble so data-sheet's `EditorPopup` closes the popover. Color styles are
 * precomputed per interval to keep typing responsive. */
export function IntervalEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: string) => void;
}) {
  const intervals = useAtomValue(intervalsAtom);
  const inDarkMode = useInDarkMode();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedId = value == null || value === "" ? null : parseInt(value);

  // Precompute color styles once (per interval set / theme) rather than on
  // every keystroke.
  const colorStyles = useMemo(() => {
    const map = new Map<number, object>();
    for (const iv of intervals) {
      map.set(iv.int_id, getColorPair(iv.color, inDarkMode));
    }
    return map;
  }, [intervals, inDarkMode]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered =
      q === ""
        ? intervals
        : intervals.filter((iv) => iv.name?.toLowerCase().includes(q));
    // Keep the current selection pinned to the top, then the top matches.
    const selected =
      selectedId != null
        ? intervals.find((iv) => iv.int_id === selectedId)
        : null;
    if (selected != null) {
      filtered = [
        selected,
        ...filtered.filter((iv) => iv.int_id !== selectedId),
      ];
    }
    return filtered.slice(0, MAX_RESULTS);
  }, [intervals, query, selectedId]);

  // Keep the active index in range and scroll it into view.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, matches.length - 1)));
  }, [matches]);
  useEffect(() => {
    const items = listRef.current?.querySelectorAll("li");
    items?.[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const commit = (iv: Interval | undefined) => {
    if (iv != null) onChange(iv.int_id.toString());
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(matches[activeIndex]);
    }
    // Escape is intentionally left to bubble so EditorPopup closes.
  };

  return h(
    "div.interval-editor",
    { onWheel: (e: any) => e.stopPropagation() },
    [
      h(InputGroup, {
        autoFocus: true,
        leftIcon: "search",
        placeholder: "Search intervals…",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        },
        onKeyDown,
      }),
      h(
        Menu,
        { className: "interval-list", ulRef: listRef },
        matches.map((iv, i) => {
          const isSelected = iv.int_id === selectedId;
          return h(MenuItem, {
            key: iv.int_id,
            text: iv.name,
            // The active (selected) interval shows an inline X to clear it;
            // others show their id.
            label: isSelected ? undefined : iv.int_id.toString(),
            labelElement: isSelected
              ? h(Button, {
                  icon: "cross",
                  minimal: true,
                  small: true,
                  onClick: (e: any) => {
                    e.stopPropagation();
                    onChange("");
                  },
                })
              : undefined,
            active: i === activeIndex,
            icon: isSelected ? "tick" : "blank",
            style: colorStyles.get(iv.int_id),
            shouldDismissPopover: false,
            onClick: () => commit(iv),
          });
        })
      ),
    ]
  );
}
