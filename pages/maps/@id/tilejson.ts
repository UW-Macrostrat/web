import { tileserverDomain } from "@macrostrat-web/settings";

/** What `/map/<slug>/tilejson.json` says about a source: where its tiles are,
 * its bounds, and the zooms it is drawn at. */
export interface TileJSON {
  tiles: string[];
  bounds: [number, number, number, number];
  minzoom: number;
  maxzoom: number;
  /** `[lng, lat, zoom]`, only where the bounds are too large to see at
   * `minzoom`: a point inside the footprint to open at instead. */
  center?: [number, number, number];
}

export function tileJSONURL(ident: string | number) {
  return `${tileserverDomain}/map/${ident}/tilejson.json`;
}
