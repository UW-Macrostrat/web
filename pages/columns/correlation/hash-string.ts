import { LineString } from "geojson";
import { setHashString } from "@macrostrat/ui-components";
import { parseLineFromString, stringifyLine } from "@macrostrat/column-views";
import {
  parseTimeFilterParams,
  timeFilterToParams,
  type TimeFilterParams,
} from "~/components/time-filter";

interface CorrelationHashParams {
  section?: LineString | null;
  unit?: number;
  /** Shared time filter (`int_id`, `t_age`, `b_age`), see `~/components/time-filter` */
  time?: TimeFilterParams | null;
}

export function getCorrelationHashParams(): CorrelationHashParams {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const _section = hash.get("section");
  const _unit = hash.get("unit");

  let section = parseLineFromString(_section);
  let unit: number = null;

  if (_unit != null) {
    unit = Number(_unit);
  }

  const time = parseTimeFilterParams(hash);

  return {
    section,
    unit,
    time,
  };
}

export function setHashStringForCorrelation(state: CorrelationHashParams) {
  const { section, unit, time = null } = state;
  let _section = section;
  if (_section != null && _section.coordinates.length < 2) {
    _section = null;
  }
  if (_section == null && time == null) {
    return;
  }
  let _unit = unit;
  if (unit == null) {
    _unit = undefined;
  }

  let hash = {
    section: _section == null ? undefined : stringifyLine(_section),
    unit: _unit,
    ...timeFilterToParams(time),
  };
  setHashString(hash);
}
