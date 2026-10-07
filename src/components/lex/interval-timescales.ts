import hyper from "@macrostrat/hyper";
import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import { scaleLinear } from "d3-scale";
import {
  Timescale,
  TimescaleOrientation,
  type Interval,
} from "@macrostrat/timescale";
import { navigateToInterval } from "./index";
import { Link } from "~/components";
import {
  INTERNATIONAL_TIMESCALE_ID,
  WINDOW_LENGTH,
  buildTimescaleTree,
  capitalizeWords,
  intervalWindow,
  referenceLevels,
  treeDepth,
} from "./timescale-data";
import styles from "./interval-timescales.module.sass";

const h = hyper.styled(styles);

const ICS_RANKS = { eon: 1, era: 2, period: 3, epoch: 4, age: 5 };

interface TimescaleLink {
  id: number;
  name: string;
}

interface TimescaleRow extends TimescaleLink {
  tree: Interval[];
  levels: [number, number];
  /** Timescales that only repeat this row's intervals here */
  also: TimescaleLink[];
}

/** Every timescale an interval belongs to, clipped to the interval plus
 * enough of its neighbors to step to them, on one age scale. */
export function IntervalTimescales({ resData, windowIntervals }) {
  const ageWindow = intervalWindow(resData);
  const rows = useMemo(
    () => timescaleRows(resData, windowIntervals ?? [], ageWindow),
    [resData, windowIntervals]
  );
  const scale = useMemo(() => {
    if (ageWindow == null) return null;
    return scaleLinear().domain(ageWindow).range([0, WINDOW_LENGTH]);
  }, [ageWindow?.[0], ageWindow?.[1]]);
  const intervalStyle = useIntervalStyle(resData);

  if (scale == null || rows.length == 0) return null;

  return h(
    "div.interval-timescales",
    rows.map((row, i) =>
      h(TimescaleRow, {
        key: row.id,
        row,
        scale,
        intervalStyle,
        showAgeAxis: i == rows.length - 1,
      })
    )
  );
}

function TimescaleRow({ row, scale, intervalStyle, showAgeAxis }) {
  const rowScale = useMemo(() => scale.copy(), [scale]);
  return h("div.row", [
    h(RowHeader, { row }),
    h(Timescale, {
      intervals: row.tree,
      scale: rowScale,
      orientation: TimescaleOrientation.HORIZONTAL,
      absoluteAgeScale: true,
      levels: row.levels,
      showAgeAxis,
      intervalStyle,
      onClick: (e, d) => navigateToInterval(d),
      className: "timescale",
    }),
  ]);
}

function RowHeader({ row }) {
  let also = null;
  if (row.also.length > 0) {
    also = h("span.also", [
      "also ",
      ...row.also.flatMap((t, i) => [
        h.if(i > 0)("span", ", "),
        h(TimescaleLinkItem, { key: t.id, timescale: t }),
      ]),
    ]);
  }
  return h("div.row-header", [
    h("h2.row-title", h(TimescaleLinkItem, { timescale: row })),
    also,
  ]);
}

function TimescaleLinkItem({ timescale }) {
  return h(Link, { href: "/lex/timescales/" + timescale.id }, timescale.name);
}

/** The international timescale first, then the interval's other timescales.
 * Any that only repeat international intervals in this window are named in
 * the international row's label instead of drawn. */
function timescaleRows(
  resData,
  windowIntervals: any[],
  ageWindow: [number, number] | null
): TimescaleRow[] {
  if (ageWindow == null) return [];
  const others = (resData.timescales ?? []).filter(
    (t) => t.timescale_id !== INTERNATIONAL_TIMESCALE_ID
  );
  const specs = [
    { timescale_id: INTERNATIONAL_TIMESCALE_ID, name: "International timescale" },
    ...others,
  ];

  const rows: TimescaleRow[] = [];
  const repeats: TimescaleLink[] = [];
  for (const spec of specs) {
    const id = spec.timescale_id;
    const name = capitalizeWords(spec.name);
    const members = windowIntervals.filter((d) => inTimescale(d, id));
    if (members.length == 0) continue;
    const isReference = id === INTERNATIONAL_TIMESCALE_ID;
    if (!isReference && members.every((d) => inTimescale(d, INTERNATIONAL_TIMESCALE_ID))) {
      repeats.push({ id, name });
      continue;
    }

    const tree = buildTimescaleTree(id, members, name, ageWindow);
    let levels: [number, number] = [1, Math.max(treeDepth(tree), 1)];
    if (isReference) {
      levels = internationalLevels(resData, ageWindow);
    }
    rows.push({ id, name, tree, levels, also: [] });
  }

  const reference = rows.find((d) => d.id === INTERNATIONAL_TIMESCALE_ID);
  if (reference != null) {
    reference.also = repeats;
  }
  return rows;
}

/** Around the interval's own rank when it is international — two levels of
 * context above, one of detail below — and by span when it isn't. */
function internationalLevels(
  resData,
  ageWindow: [number, number]
): [number, number] {
  const rank = ICS_RANKS[resData.int_type?.toLowerCase()];
  if (rank == null || !inTimescale(resData, INTERNATIONAL_TIMESCALE_ID)) {
    return referenceLevels(ageWindow[0] - ageWindow[1]);
  }
  return [Math.max(1, rank - 2), Math.min(5, rank + 1)];
}

function inTimescale(interval, timescaleID: number) {
  return (interval.timescales ?? []).some(
    (t) => t.timescale_id === timescaleID
  );
}

/** Mark the interval itself, and quiet what lies wholly in the padding. */
function useIntervalStyle(resData) {
  const { int_id, b_age, t_age } = resData;
  return useCallback(
    (interval: Interval): CSSProperties => {
      if (interval.int_id === int_id) {
        return {
          boxShadow: "inset 0 0 0 2px var(--pz-text-emphasized-color)",
          fontWeight: 600,
        };
      }
      if (interval.eag <= t_age || interval.lag >= b_age) {
        return { opacity: 0.5 };
      }
      return {};
    },
    [int_id, b_age, t_age]
  );
}
