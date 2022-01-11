import { getVisibleScale } from "../../app-state";

function setStyle(props) {
  const { map, maps, selectedScale, activeFeature } = props;
  if (!map.getSource("burwell-sources")) {
    // setting up the beginning
    map.scale = selectedScale;
    const filteredMaps = {
      type: "FeatureCollection",
      features: getVisibleScale(maps, selectedScale).filter(
        (f) => f.properties.source_id != 154
      ),
    };
    map.addSource("burwell-sources", {
      type: "geojson",
      data: filteredMaps,
    });
    map.addLayer({
      id: "sources-fill",
      type: "fill",
      source: "burwell-sources", // reference the data source
      paint: {
        "fill-opacity": 0.5,
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "active"], false],
          "#ffae80",
          "#aaaaaa",
        ],
      },
    });
    map.addLayer({
      id: "outline",
      type: "line",
      source: "burwell-sources",
      layout: {},
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "clicked"], false],
          "#ffae80",
          "#333",
        ],
        "line-width": 2,
      },
    });
  } else {
    if (selectedScale != map.scale) {
      // if the scale has been changed
      // reset the data on the burwell-sources source
      map.scale = selectedScale;
      const filteredMaps = {
        type: "FeatureCollection",
        features: getVisibleScale(maps, selectedScale).filter(
          (f) => f.properties.source_id != 154
        ),
      };
      map.getSource("burwell-sources").setData(filteredMaps);
    }

    if (activeFeature.id !== undefined) {
      console.log("Adding active state");
      map.setFeatureState(
        { source: "burwell-sources", id: activeFeature.id },
        { active: true }
      );
    } else {
      let features = map.queryRenderedFeatures({
        layers: ["sources-fill"],
      });
      features.map((f) => {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { active: false }
        );
      });
    }
  }
}

async function mapSources(
  map,
  maps,
  onSelectFeatures,
  openMenu,
  activeFeature,
  selectedScale
) {
  setStyle({ map, maps, selectedScale, activeFeature });

  map.on("click", (e) => {
    let features = map.queryRenderedFeatures({
      layers: ["sources-fill"],
    });
    features.map((f) => {
      map.setFeatureState(
        { source: "burwell-sources", id: f.id },
        { clicked: false }
      );
    });
  });
  map.on("click", "sources-fill", (e) => {
    let features = map.queryRenderedFeatures({
      layers: ["sources-fill"],
    });
    console.log("feature clicked");
    features.map((f) => {
      map.setFeatureState(
        { source: "burwell-sources", id: f.id },
        { clicked: false }
      );
    });
    let features_ = [];
    e.features.map((f) => {
      if (f.state.clicked) {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: false }
        );
      } else {
        features_.push(f);
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: true }
        );
      }
    });
    if (e.features.length) {
      onSelectFeatures(features_);
    }
  });
}

export { mapSources };
