import { LineString } from "geojson";
import { setHashString } from "@macrostrat/ui-components";

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

  let section = parseSectionFromHash(_section);
  let unit: number = null;

  if (_unit != null) {
    unit = parseNumber(_unit);
  }

  return {
    section,
    unit,
  };
}

function parseSectionFromHash(section: any): LineString | null {
  /* Section should be specified as space-separated coordinates */
  if (section == null || typeof section !== "string") {
    return null;
  }

  console.log(section);

  try {
    let coords = section.split(" ").map(parseCoordinates);
    return {
      type: "LineString",
      coordinates: coords,
    };
  } catch (e) {
    console.warn(e);
    return null;
  }
}

function parseCoordinates(s: string): [number, number] {
  let [x, y] = s.split(",").map(parseNumber);
  if (x == null || y == null || isNaN(x) || isNaN(y)) {
    throw new Error("Invalid coordinate string");
  }
  if (x > 180 || x < -180 || y > 90 || y < -90) {
    throw new Error("Invalid coordinate value");
  }
  return [x, y];
}

function parseNumber(s: string): number {
  let s1 = s;
  // For some reason, we sometimes get en-dashes in the hash string
  if (s1[0] == "−") {
    s1 = "-" + s1.slice(1);
  }
  return Number(s1);
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
    section: section.coordinates
      .map((coord) => coord.map((d) => d.toFixed(2)).join(","))
      .join(" "),
    unit: _unit,
  };
  setHashString(hash);
}
