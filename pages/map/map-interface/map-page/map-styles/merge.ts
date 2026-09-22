import { mergeStyles } from "@macrostrat/mapbox-utils";

/** The same test `toggleMapLabelVisibility` uses, so the label toggle and this
 * ordering always agree on what counts as a label. */
function isLabelLayer(layer): boolean {
  return layer?.layout?.["text-field"] != null;
}

/** Merge the geologic map and the interaction overlay onto a base map style,
 * keeping the base map's labels above the geology.
 *
 * `mergeStyles` concatenates layer lists, so the geologic map lands on top of
 * every layer the base style draws — place names and road labels included, at
 * every zoom. Lifting the label layers over the geology keeps them readable.
 *
 * Only the labels move: the base map's other layers (roads, boundaries,
 * hillshade) keep their order and stay beneath the geology, and the overlay is
 * merged last, so columns, fossil collections and cross-sections still sit on
 * top of everything. In the satellite style the labels are interleaved with
 * road lines rather than collected at the end, so this does lift those labels
 * over those lines — which is the readable order anyway.
 */
export function mergeMapStyles(
  baseStyle,
  macrostratStyle,
  overlayStyle
): mapboxgl.Style {
  const layers = baseStyle?.layers ?? [];
  const labels = layers.filter(isLabelLayer);
  if (labels.length === 0) {
    return mergeStyles(baseStyle, macrostratStyle, overlayStyle);
  }

  const basemap = {
    ...baseStyle,
    layers: layers.filter((layer) => !isLabelLayer(layer)),
  };
  return mergeStyles(
    basemap,
    macrostratStyle,
    { layers: labels },
    overlayStyle
  );
}
