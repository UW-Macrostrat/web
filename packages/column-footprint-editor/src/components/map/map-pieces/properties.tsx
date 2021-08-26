import { fetchProjColGroups } from "../../../context";
import { colorAttribute, createMapboxPaintConditional } from "./utils";

async function propertyViewMap(map, state, setFeatures, setOpen) {
  console.log("MAP", map);
  console.log("State", state);

  let colGroups = await fetchProjColGroups(state.project_id);

  colGroups = colorAttribute(colGroups);
  let paintConditionals = createMapboxPaintConditional(colGroups);

  map.addSource("columns", {
    type: "geojson",
    data: state.columns,
  });
  map.addLayer({
    id: "column-fill",
    type: "fill",
    source: "columns", // reference the data source
    paint: {
      "fill-color": paintConditionals,
      "fill-opacity": 0.5,
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

  map.on("click", "column-fill", async function(e) {
    var features = map.queryRenderedFeatures(e.point);
    //console.log("feautresss", features);
    setFeatures(e.features);
    setOpen(true);
  });
}

export { propertyViewMap };
