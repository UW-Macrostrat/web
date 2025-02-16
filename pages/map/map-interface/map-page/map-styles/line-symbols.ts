/** Experimental line symbol support */
import { symbolLayerPaintProperties } from "@macrostrat/map-styles";
import { setupLineSymbols } from "@macrostrat/map-styles";

import mapboxgl from "mapbox-gl";

const symbolIndex = {
  //"anticline-hinge",
  //"left-lateral-fault",
  "normal fault": "normal-fault",
  "reverse fault": "reverse-fault",
  //"right-lateral-fault",
  // "syncline-hinge",
  "thrust fault": "thrust-fault",
  syncline: "syncline-hinge",
  anticline: "anticline-hinge",
};

const reverseSources = [229, 210, 133, 74, 75, 40, 205, 154];

function sizeExpression(sz) {
  return ["case", ["!=", ["get", "name"], ""], sz * 1.5, sz];
}

export function macrostratLineSymbolLayers() {
  let symbolLayers = [];
  for (const [key, lyr] of Object.entries(symbolIndex)) {
    let color = "#000000";
    let rotate: any = 0;
    if (["syncline", "anticline"].includes(key)) {
      color = "#F012BE";
    } else {
      // We build a case statement here to reverse some sources
      // on the fly...
      let val: any[] = ["case"];
      for (const source of reverseSources) {
        val.push(["==", ["get", "source_id"], source], 180);
      }
      // default
      val.push(0);
      rotate = [...val];
    }

    const val = {
      ...symbolLayerPaintProperties(lyr, { color, rotate, sizeExpression }),
      id: `${lyr}-stroke`,
      source: "burwell",
      "source-layer": "lines",
      filter: ["==", "type", key],
      minzoom: 0,
      maxzoom: 16,
    };

    symbolLayers.push(val);
  }
  return symbolLayers;
}

async function addLineSymbolLayers(map) {
  await setupLineSymbols(map);
  const layers = macrostratLineSymbolLayers();
  for (const layer of layers) {
    if (map.getLayer(layer.id) != null) continue;
    map.addLayer(layer);
  }
}

function removeLineSymbolLayers(map) {
  for (const layer of macrostratLineSymbolLayers()) {
    if (map.getLayer(layer.id) == null) continue;
    map.removeLayer(layer.id);
  }
}

export async function toggleLineSymbols(map: mapboxgl.Map, isOn: boolean) {
  if (isOn) {
    await addLineSymbolLayers(map);
  } else {
    removeLineSymbolLayers(map);
  }
}
