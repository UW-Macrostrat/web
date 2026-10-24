import { getTerrainSourceID } from "@macrostrat/mapbox-utils";

/** The elevation source 3D terrain is drawn from, apart from the hillshade's.
 *
 * Terrain and a hillshade sharing one `raster-dem` source make Mapbox load that
 * source at terrain resolution, and the hillshade loses its detail once terrain
 * switches on. A second source with the same tiles keeps them independent, at
 * the cost of loading the tiles twice. `setup3DTerrain` uses a named source as
 * given, so the copy has to be in the style itself. */
export const TERRAIN_SOURCE_ID = "macrostrat-terrain-dem";

/** A base style with its own terrain source. Also works as a `MapView`
 * `transformStyle`, which runs after terrain is merged in, so a `terrain`
 * already pointing at the hillshade's source is moved to the copy.
 *
 * The copy goes first: without a `terrainSourceID`, `MapView` drapes terrain
 * over the first `raster-dem` source it finds. */
export function withSeparateTerrainSource(style) {
  if (style?.sources == null) return style;
  const demID = getTerrainSourceID(style);
  if (demID == null) return style;

  const next = {
    ...style,
    sources: { [TERRAIN_SOURCE_ID]: { ...style.sources[demID] }, ...style.sources },
  };
  if (style.terrain?.source == demID) {
    next.terrain = { ...style.terrain, source: TERRAIN_SOURCE_ID };
  }
  return next;
}

/** The terrain source to pass `MapView` for a style built with
 * `withSeparateTerrainSource`, if it has one. */
export function separateTerrainSourceID(style): string | null {
  if (style?.sources?.[TERRAIN_SOURCE_ID] == null) return null;
  return TERRAIN_SOURCE_ID;
}
