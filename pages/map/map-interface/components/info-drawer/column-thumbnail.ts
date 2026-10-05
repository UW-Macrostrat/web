/** A glance at the stratigraphic column behind the "Regional stratigraphy"
 * heading: the matched units alone (or, without a match, the map unit's own
 * age span) in a window just wider than they are. It is the hint that the
 * heading opens a full column, which a text link alone did not give. */
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import {
  Column,
  ColoredUnitComponent,
  UnitComponent,
} from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers";
import { columnInfoAtom } from "../../app-state";
import { useAtomValue } from "jotai";
import { useMemo } from "react";

const h = hyper.styled(styles);

export const THUMBNAIL_HEIGHT = 72;
export const THUMBNAIL_WIDTH = 44;
/** Room on either side of the focal span, as a fraction of it */
const WINDOW_MARGIN = 0.12;

interface AgeRange {
  b_age: number;
  t_age: number;
}

/** The matched units' span when the map unit is matched, else the map legend's */
export function focalAgeRange(source): AgeRange | null {
  const matched = source?.macrostrat;
  if (matched?.b_age != null && matched?.t_age != null) {
    return { b_age: matched.b_age, t_age: matched.t_age };
  }
  const b_age = source?.b_int?.b_age;
  const t_age = source?.t_int?.t_age;
  if (b_age == null || t_age == null) return null;
  return { b_age, t_age };
}

function paddedWindow(range: AgeRange): AgeRange {
  const span = Math.max(range.b_age - range.t_age, 0.1);
  const pad = span * WINDOW_MARGIN;
  return {
    b_age: range.b_age + pad,
    t_age: Math.max(range.t_age - pad, 0),
  };
}

/** The linked units in this column; failing any, the map unit itself stands
 * in so the thumbnail still shows where it sits in time. */
function thumbnailUnits(columnUnits, source, range: AgeRange) {
  const ids: number[] = source?.macrostrat?.unit_ids ?? [];
  const linked = (columnUnits ?? []).filter((u) => ids.includes(u.unit_id));
  if (linked.length > 0) {
    return { units: linked, unitComponent: ColoredUnitComponent };
  }
  const unit = {
    unit_id: -1,
    unit_name: source.name,
    strat_name_long: source.name,
    b_age: range.b_age,
    t_age: range.t_age,
    color: source.color || source.b_int?.color,
    lith: [],
    environ: [],
    econ: [],
  };
  return { units: [unit], unitComponent: MapUnitComponent };
}

/** The map unit in the legend's own color */
function MapUnitComponent(props) {
  return h(UnitComponent, {
    backgroundColor: props.division.color,
    ...props,
  });
}

export function ColumnThumbnail({ source }) {
  const { state, data: columnInfo } = useAtomValue(columnInfoAtom);
  const range = focalAgeRange(source);
  const b_age = range?.b_age;
  const t_age = range?.t_age;

  const drawn = useMemo(() => {
    if (b_age == null || t_age == null || columnInfo == null) return null;
    return thumbnailUnits(columnInfo.units, source, { b_age, t_age });
  }, [columnInfo, source, b_age, t_age]);

  // An instant has no height to draw
  if (range == null || range.b_age <= range.t_age) return null;
  // Hold the space while the column's units load
  if (drawn == null) {
    if (state === "loading") return h("div.column-thumbnail.placeholder");
    return null;
  }

  const window = paddedWindow(range);
  const pixelScale = THUMBNAIL_HEIGHT / (window.b_age - window.t_age);

  return h(
    "div.column-thumbnail",
    h(
      PatternProvider,
      h(Column, {
        units: drawn.units,
        unitComponent: drawn.unitComponent,
        t_age: window.t_age,
        b_age: window.b_age,
        pixelScale,
        minPixelScale: 0,
        minSectionHeight: 0,
        unconformityHeight: 4,
        unconformityLabels: "none",
        collapseSmallUnconformities: true,
        showTimescale: false,
        showAgeAxis: false,
        showLabelColumn: false,
        showLabels: false,
        // Nothing fits a label at this width
        labelSuppressHeight: 1e4,
        clipUnits: true,
        width: THUMBNAIL_WIDTH,
        columnWidth: THUMBNAIL_WIDTH,
        padding: 0,
      })
    )
  );
}
