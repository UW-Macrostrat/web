import { LineString } from "geojson";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { chunk } from "underscore";
import { useEffect } from "react";
import { fmt2 } from "~/pages/map/map-interface/utils";

export function getFocusedLineFromHashParams(): LineString | null {
  if (typeof window === "undefined") {
    return null;
  }
  let hash = getHashString(window.location.hash);

  if (hash?.line == null) {
    return null;
  }

  try {
    let coords = hash.line;
    if (!Array.isArray(coords)) {
      console.error("Invalid line coordinates in hash string");
      return null;
    }

    if (coords.length < 2) {
      return null;
    }
    if (coords.length % 2 != 0) {
      console.error("Invalid number of coordinates in hash string");
      return null;
    }

    return {
      type: "LineString",
      coordinates: chunk(coords.map(Number), 2),
    };
  } catch (e) {
    console.error("Error parsing hash string", e);
    return null;
  }
}

export function setHashStringForLine(focusedLine: LineString) {
  let hash = {
    line: focusedLine.coordinates.flatMap((coord) => coord.map(fmt2)),
  };
  setHashString(hash);
}
