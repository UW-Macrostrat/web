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

    console.log("coords", coords);

    if (coords.length < 2) {
      return null;
    }
    if (coords.length % 2 != 0) {
      console.error("Invalid number of coordinates in hash string");
      return null;
    }

    coords = chunk(coords, 2);

    return {
      type: "LineString",
      coordinates: coords.map((coord) => coord.map(Number)),
    };
  } catch (e) {
    console.error("Error parsing hash string", e);
    return null;
  }
}

export function HashStringManager({ focusedLine }) {
  useEffect(() => {
    if (focusedLine == null || focusedLine.coordinates.length < 2) {
      return;
    }
    let hash = {
      line: focusedLine.coordinates.flatMap((coord) => coord.map(fmt2)),
    };
    setHashString(hash);
  }, [focusedLine]);

  return null;
}
