import React from "react";
import { useBurwellActions } from "~/burwell-sources/app-state";
import { ExpansionPanel } from "~/map-interface/components/expansion-panel";
import h from "@macrostrat/hyper";
import { settings, zoomMap } from "../app-state/utils";

function FeatureTable(props) {
  const { d } = props;

  return (
    <table>
      <tbody>
        <tr>
          <td>
            <b>Source ID</b>
          </td>
          <td>{d.properties.source_id}</td>
        </tr>
        <tr>
          <td>
            <b>Scale</b>
          </td>
          <td>
            <span className={"badge left scale-badge " + d.properties.scale}>
              {d.properties.scale}
            </span>
          </td>
        </tr>
        <tr>
          <td>
            <b>Features</b>
          </td>
          <td>{d.properties.features}</td>
        </tr>
      </tbody>
    </table>
  );
}

function ViewMap({ feature }) {
  return (
    <a
      href={
        settings.uri +
        "/burwell#" +
        zoomMap[feature.properties.scale] +
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
  );
}

function FeatureContent({ d, activateFeature }) {
  return (
    <div
      onMouseEnter={() => activateFeature(d)}
      onMouseOut={() => activateFeature({})}
    >
      <p>
        <span className="map-source-title">{d.properties.ref_title}</span>
        {d.properties.authors} ({d.properties.ref_year}).{" "}
        <i>{d.properties.ref_title}</i>. {d.properties.ref_source}.
        {d.properties.isbn_doi}. Retrieved from{" "}
        <a href={d.properties.url} target="_blank">
          {d.properties.url}
        </a>
        .{" "}
      </p>
      <FeatureTable d={d} />
      <ViewMap feature={d} />
    </div>
  );
}

const FeatureList = ({ features }) => {
  const runAction = useBurwellActions();
  const activateFeature = (feature) => {
    runAction({ type: "activate-feature", activeFeature: feature });
  };

  return (
    <div className="feature-list-container">
      {features.map((d, i) => {
        return h(
          ExpansionPanel,
          { title: d.properties.name, expanded: true, key: i },
          [<FeatureContent d={d} activateFeature={activateFeature} />]
        );
      })}
    </div>
  );
};

export { FeatureContent };
export default FeatureList;
