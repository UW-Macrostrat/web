import { LineString } from "geojson";
import { setHashString } from "@macrostrat/ui-components";
import { parseLineFromString, stringifyLine } from "@macrostrat/column-views";
import {
  parseTimeFilterParams,
  timeFilterToParams,
  type TimeFilterParams,
} from "~/components/time-filter";
import { parseProjectID, PROJECT_FILTER_KEY } from "~/components/project-filter";

interface CorrelationHashParams {
  /** Line of section; the chart's columns are those it crosses. */
  section?: LineString | null;
  /** An explicit, ordered column selection (`columns=1,2,3`) — the manual
   * alternative to a line of section, and how a column page hands off to this
   * one. Mutually exclusive with `section`. */
  columns?: number[] | null;
  unit?: number;
  /** Shared time filter (`int_id`, `t_age`, `b_age`), see `~/components/time-filter` */
  time?: TimeFilterParams | null;
  /** Shared project filter, see `~/components/project-filter` */
  project_id?: number | null;
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

  const columns = parseColumnIDs(hash.get("columns"));
  const time = parseTimeFilterParams(hash);
  const project_id = parseProjectID(hash.get(PROJECT_FILTER_KEY));

  return {
    section,
    columns,
    unit,
    time,
    project_id,
  };
}

function parseColumnIDs(value: string | null): number[] | null {
  if (value == null || value === "") return null;
  const ids = value
    .split(",")
    .map((d) => parseInt(d, 10))
    .filter((d) => Number.isFinite(d));
  if (ids.length === 0) return null;
  return ids;
}

export function setHashStringForCorrelation(state: CorrelationHashParams) {
  const { section, unit, time = null, columns = null, project_id = null } = state;
  let _section = section;
  if (_section != null && _section.coordinates.length < 2) {
    _section = null;
  }
  let _columns = columns;
  if (_columns != null && _columns.length === 0) {
    _columns = null;
  }
  if (_section == null && _columns == null && time == null && project_id == null) {
    return;
  }
  let _unit = unit;
  if (unit == null) {
    _unit = undefined;
  }

  let sectionString: string | undefined = undefined;
  if (_section != null) {
    sectionString = stringifyLine(_section);
  }
  let columnsString: string | undefined = undefined;
  if (_columns != null) {
    columnsString = _columns.join(",");
  }

  let hash = {
    section: sectionString,
    columns: columnsString,
    unit: _unit,
    ...timeFilterToParams(time),
    [PROJECT_FILTER_KEY]: project_id?.toString(),
  };
  setHashString(hash);
}
