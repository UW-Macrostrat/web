export function enable3DTerrain(map, shouldEnable: boolean) {
  if (!map.style._loaded) {
    map.once("style.load", () => {
      enable3DTerrain(map, shouldEnable);
    });
    return;
  }
  let demSource = getTerrainSource(map);

  if (shouldEnable) {
    if (demSource == null) {
      demSource = "mapbox-dem";
      map.addSource(demSource, {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 18,
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
  }
  // Enable or disable terrain depending on our current desires...
  const currentTerrain = map.getTerrain();
  if (shouldEnable && currentTerrain == null) {
    map.setTerrain({ source: demSource, exaggeration: 1 });
  } else if (!shouldEnable && currentTerrain != null) {
    map.setTerrain(null);
  }
}

function getTerrainSource(map) {
  for (const [key, source] of Object.entries(map.getStyle().sources)) {
    if (source.type == "raster-dem") {
      return key;
    }
  }
  return null;
}
