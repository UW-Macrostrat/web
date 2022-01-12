import { getVisibleScale } from "../../app-state";

function setStyle(props) {
  const { map, maps, selectedScale, activeFeature } = props;
  if (map.getSource("burwell-sources")) {
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
      map.activeFeatureId = activeFeature.id;
      map.setFeatureState(
        { source: "burwell-sources", id: activeFeature.id },
        { active: true }
      );
    } else {
      if (map.activeFeatureId) {
        map.setFeatureState(
          { source: "burwell-sources", id: map.activeFeatureId },
          { active: false }
        );
      }
    }
  }
}

async function mapSources(
  map,
  maps,
  onSelectFeatures,
  activeFeature,
  selectedScale
) {
  map.on("load", () => {
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
  });

  setStyle({ map, maps, selectedScale, activeFeature });

  map.sourcesFillListener = (e) => {
    if (map.clickedFeatures) {
      map.clickedFeatures.map((f) => {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: false }
        );
      });
    }
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
      map.clickedFeatures = features_;
      onSelectFeatures(features_);
    }
  };

  map.clickMap = (e) => {
    if (map.clickedFeatures) {
      map.clickedFeatures.map((f) => {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: false }
        );
      });
    }
  };

  map.on("click", map.clickMap);
  map.on("click", "sources-fill", map.sourcesFillListener);
}

export { mapSources };
