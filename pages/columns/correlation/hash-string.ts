import { LineString } from "geojson";
import { setHashString } from "@macrostrat/ui-components";
import { parseLineFromString, stringifyLine } from "@macrostrat/column-views";

interface CorrelationHashParams {
  section?: LineString | null;
  unit?: number;
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

  return {
    section,
    unit,
  };
}

export function setHashStringForCorrelation(state: CorrelationHashParams) {
  const { section, unit } = state;
  if (section == null) {
    return;
  }
  if (section.coordinates.length < 2) {
    return;
  }
  let _unit = unit;
  if (unit == null) {
    _unit = undefined;
  }

  let hash = {
    section: stringifyLine(section),
    unit: _unit,
  };
  setHashString(hash);
}
