import React from "react";
import {
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";
import { settings, zoomMap } from "../app-state/utils";

const widths = {
  1: "twelve columns",
  2: "six columns",
  3: "four columns",
  4: "three columns",
};

const IndexMapInfo = () => {
  const runAction = useBurwellActions();

  const { selectedFeatures: features, menuOpen } = useBurwellState(
    (state) => state
  );
  const activateFeature = (feature) => {
    runAction({ type: "activate-feature", activeFeature: feature });
  };
  const closeMenu = () => {
    runAction({ type: "toggle-menu", menuOpen: false });
  };
  const containerClassName =
    features.length <= 3 ? "info-content" : "info-content-list";

  return (
    <div className={menuOpen ? "info open" : "info"}>
      <div className="info-header">
        <div
          onClick={() => {
            closeMenu();
          }}
          className="info-close"
        >
          x
        </div>
      </div>
      <div className={containerClassName}>
        {features.map((feature, idx) => {
          const { properties } = feature;
          return (
            <div
              className={"feature-content"}
              key={idx}
              onMouseOver={() => {
                activateFeature(feature);
              }}
              onMouseOut={() => {
                activateFeature({});
              }}
            >
              <p>
                <span className="map-source-title">{properties.ref_title}</span>
                . {properties.authors}. {properties.ref_source}.{" "}
                <span className="map-source-year">{properties.ref_year}</span>.
                Retrieved from{" "}
                <a href={properties.url} target="_blank">
                  {properties.url}
                </a>
                .{" "}
                <span className={"badge left scale-badge " + properties.scale}>
                  {properties.scale}
                </span>{" "}
                Source ID: {properties.source_id}.{" "}
                <a
                  href={
                    settings.uri +
                    "/burwell#" +
                    zoomMap[properties.scale] +
                    "/" +
                    (feature.geometry.coordinates[0][0][1] +
                      feature.geometry.coordinates[0][2][1]) /
                      2 +
                    "/" +
                    (feature.geometry.coordinates[0][0][0] +
                      feature.geometry.coordinates[0][2][0]) /
                      2
                  }
                  target="_blank"
                >
                  View map
                </a>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IndexMapInfo;
