import { fetchProjColGroups } from "../../../context";
import {
  colorAttribute,
  createMapboxPaintConditional,
  addIdsToGeoJSON,
} from "./utils";

async function propertyViewMap(
  map,
  state,
  setFeatures,
  setOpen,
  setLegendColumns
) {
  console.log("MAP", map);
  console.log("State", state);

  let colGroups = await fetchProjColGroups(state.project.project_id);

  colGroups = colorAttribute(colGroups);
  setLegendColumns(colGroups);
  let paintConditionals = createMapboxPaintConditional(colGroups);

  let data = addIdsToGeoJSON(state.columns);

  map.addSource("columns", {
    type: "geojson",
    data,
  });
  map.addLayer({
    id: "column-fill",
    type: "fill",
    source: "columns", // reference the data source
    paint: {
      "fill-color": paintConditionals,
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "clicked"], false],
        1,
        0.3,
      ],
    },
  });
  map.addLayer({
    id: "outline",
    type: "line",
    source: "columns",
    layout: {},
    paint: {
      "line-color": "#000",
      "line-width": 1,
    },
  });
  map.on("mouseenter", "column-fill", async function(e) {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "column-fill", async function(e) {
    map.getCanvas().style.cursor = "";
  });

  let highlightedFeature = null;
  map.on("click", "column-fill", async function(e) {
    if (e.features.length > 0) {
      if (highlightedFeature !== null) {
        map.setFeatureState(
          { source: "columns", id: highlightedFeature },
          { clicked: false }
        );
      }
      highlightedFeature = e.features[0].id;
      map.setFeatureState(
        { source: "columns", id: highlightedFeature },
        { clicked: true }
      );
    }
    setFeatures(e.features);
    setOpen(true);
  });
}

export { propertyViewMap };
