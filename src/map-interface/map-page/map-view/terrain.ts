// We should merge this with code in @macrostrat/mapbox-react/src/terrain.ts:

export function enable3DTerrain(
  map,
  shouldEnable: boolean,
  sourceID: string | null = null
) {
  let demSourceID = sourceID ?? getTerrainSourceID(map) ?? "mapbox-dem";

  console.log("Enabling 3D terrain with source", demSourceID);

  if (!map.style._loaded) {
    map.once("style.load", () => {
      enable3DTerrain(map, shouldEnable, demSourceID);
    });
    return;
  }

  // Enable or disable terrain depending on our current desires...
  const currentTerrain = map.getTerrain();
  if (!shouldEnable) {
    if (currentTerrain != null) map.setTerrain(null);
    return;
  }
  if (currentTerrain != null) return;

  // Add a DEM source if one is not found already.
  if (map.getSource(demSourceID) == null) {
    map.addSource(demSourceID, {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }

  // add a sky layer that will show when the map is highly pitched
  if (map.getLayer("sky") == null) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15,
      },
    });
  }

  map.setTerrain({ source: demSourceID, exaggeration: 1 });
}

function getTerrainSourceID(map) {
  for (const [key, source] of Object.entries(map.getStyle().sources)) {
    if (source.type == "raster-dem") {
      return key;
    }
  }
  return null;
}
