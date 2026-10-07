/** A geologic legend: its entries, youngest first, and the details of one.
 *
 * Shared by the viewport legend (`/dev/map/legend`) and the map pages
 * (`/maps/<slug>`). Selection belongs to the page, so it comes in as props.
 * Intervals and lithologies arrive as bare IDs and are resolved against the
 * definition maps a `MacrostratDataProvider` above this manages.
 */

import hyper from "@macrostrat/hyper";
import { Button, NonIdealState, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import {
  DataField,
  IntervalField,
  LithologyList,
} from "@macrostrat/data-components";
import { useMacrostratDefs } from "@macrostrat/data-provider";
import { JSONView } from "@macrostrat/ui-components";
import { useMemo, useState } from "react";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

enum LegendViewMode {
  Pretty = "pretty",
  JSON = "json",
}

/** Youngest unit first, the order a geologic legend is normally read in. */
export function sortByAge(entries: any[]): any[] {
  return [...entries].sort((a, b) => bestAge(a) - bestAge(b));
}

function bestAge(unit: any): number {
  return (unit.t_age + unit.b_age) / 2;
}

/** A single selected legend entry, as details or as its raw record. */
export function LegendEntryDetailView({
  entry,
  onClose,
}: {
  entry: any;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState(LegendViewMode.Pretty);

  let content = h(LegendEntryDetails, { entry });
  if (viewMode === LegendViewMode.JSON) {
    content = h(JSONView, { data: entry, showRoot: false });
  }

  return h("div.legend-detail", [
    h(LegendDetailHeader, {
      entry,
      viewMode,
      setViewMode,
      onClose,
    }),
    content,
  ]);
}

/** Names the selected unit above its details, with its color and the
 * view-mode toggle alongside. Mirrors the panel header
 * `@macrostrat/map-interface` builds from a `title`; the library's own header
 * component isn't part of its public API, so the markup lives here. */
function LegendDetailHeader({ entry, viewMode, setViewMode, onClose }) {
  return h("header.legend-detail-header", [
    h(ColorSwatch, { color: entry.color }),
    h("span.unit-name", entry.map_unit_name ?? "Unknown unit"),
    h("div.spacer"),
    h(JSONToggleButton, { viewMode, setViewMode }),
    h(Button, { minimal: true, icon: "cross", onClick: onClose }),
  ]);
}

/** Subtle toggle between the details and the raw record, revealed on hover of
 * the header (and held visible while the raw record is showing). */
function JSONToggleButton({ viewMode, setViewMode }) {
  const isJSON = viewMode === LegendViewMode.JSON;

  let title = "Show raw record";
  let nextMode = LegendViewMode.JSON;
  if (isJSON) {
    title = "Show details";
    nextMode = LegendViewMode.Pretty;
  }

  return h(Button, {
    className: classNames("json-toggle", { active: isJSON }),
    icon: "code",
    minimal: true,
    small: true,
    active: isJSON,
    title,
    onClick: () => setViewMode(nextMode),
  });
}

export function ColorSwatch({ color }: { color: string | null }) {
  if (color == null || color === "") return null;
  return h("span.color-swatch", { style: { backgroundColor: color } });
}

export function LegendEntries({
  data,
  onSelect,
  emptyDescription = "No mapped units fall within the current view.",
}: {
  data: any[];
  onSelect: (legendID: number) => void;
  emptyDescription?: string;
}) {
  if (data.length === 0) {
    return h(NonIdealState, {
      icon: "map",
      title: "No legend entries",
      description: emptyDescription,
    });
  }

  return h(
    "div.legend-entries",
    data.map((entry) =>
      h(LegendEntry, { key: entry.legend_id, entry, onSelect })
    )
  );
}

function LegendEntry({
  entry,
  onSelect,
}: {
  entry: any;
  onSelect: (legendID: number) => void;
}) {
  const { map_unit_name, color, age } = entry;

  return h("div.legend-entry", { onClick: () => onSelect(entry.legend_id) }, [
    h(ColorSwatch, { color }),
    h("span.unit-name", map_unit_name ?? "Unknown unit"),
    h.if(age != null)(Tag, { minimal: true, className: "age-tag" }, age),
  ]);
}

function LegendEntryDetails({ entry }: { entry: any }) {
  const {
    strat_name,
    lith,
    descrip,
    comments,
    age,
    b_age,
    t_age,
    b_interval,
    t_interval,
    lith_id,
    lith_types,
  } = entry;

  const intervals = useResolvedIntervals([b_interval, t_interval]);
  const lithologies = useResolvedLithologies(lith_id, lith_types);

  return h("div.legend-entry-details", [
    h.if(strat_name != null)(DataField, {
      label: "Stratigraphic name",
      value: strat_name,
    }),
    h.if(age != null && age !== "")(DataField, { label: "Age", value: age }),
    h.if(intervals.length > 0)(IntervalField, { intervals }),
    h.if(b_age != null && t_age != null)(DataField, {
      label: "Age range",
      value: `${b_age}–${t_age}`,
      unit: "Ma",
    }),
    h.if(lith != null && lith !== "")(DataField, {
      label: "Lithology",
      value: lith,
    }),
    h.if(lithologies != null)(LithologyList, {
      label: "Matched lithologies",
      lithologies: lithologies ?? [],
    }),
    h.if(descrip != null)(DataField, { label: "Description", value: descrip }),
    h.if(comments != null)(DataField, { label: "Comments", value: comments }),
  ]);
}

/** Resolve interval IDs against the definitions the data provider manages. */
function useResolvedIntervals(intervalIDs: (number | null)[]) {
  const intervalMap = useMacrostratDefs("intervals");

  const ids = intervalIDs.filter((d) => d != null);

  return useMemo(() => {
    if (intervalMap == null) return [];
    return ids
      .map((id) => intervalMap.get(id))
      .filter((d) => d != null)
      .map((d) => ({ ...d, id: d.int_id }));
  }, [intervalMap, ids.join(",")]);
}

/** Resolve lithology IDs the same way, falling back to the entry's unmatched
 * lithology *types* when the IDs don't resolve — a legend entry whose liths
 * haven't been matched still has something to show. */
function useResolvedLithologies(
  lithIDs: number[] | null,
  lithTypes: string[] | null
) {
  const lithMap = useMacrostratDefs("lithologies");

  return useMemo(() => {
    const resolved = resolveLithologies(lithMap, lithIDs);
    if (resolved != null) return resolved;
    return fallbackLithologies(lithTypes);
  }, [lithMap, lithIDs, lithTypes]);
}

function resolveLithologies(lithMap: Map<number, any> | null, lithIDs) {
  if (lithMap == null || lithIDs == null || lithIDs.length === 0) return null;
  const resolved = lithIDs
    .map((id) => lithMap.get(id))
    .filter((d) => d != null)
    .map((d) => ({ ...d, name: d.lith ?? d.name, color: d.color ?? "#888" }));
  if (resolved.length === 0) return null;
  return resolved;
}

function fallbackLithologies(lithTypes: string[] | null) {
  if (lithTypes == null || lithTypes.length === 0) return null;
  return lithTypes.map((type, i) => ({
    name: type,
    color: "#888",
    lith_id: i,
  }));
}
