import React from "react";
import {
  useBurwellState,
  getVisibleScale,
  useBurwellActions,
} from "~/burwell-sources/app-state";
import { ExpansionPanel } from "~/map-interface/components/expansion-panel";
import h from "@macrostrat/hyper";

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

const FeatureList = () => {
  const runAction = useBurwellActions();
  const { selectedScale, maps } = useBurwellState((state) => state);

  const activateFeature = (feature) => {
    runAction({ type: "activate-feature", activeFeature: feature });
  };

  const data = getVisibleScale(maps, selectedScale);

  return (
    <div className="feature-list-container">
      {data.map((d, i) => {
        return h(
          ExpansionPanel,
          { title: d.properties.name, expanded: true, key: i },
          [
            <div className="eight columns">
              <p
                onMouseEnter={() => activateFeature(d)}
                onMouseOut={() => activateFeature({})}
              >
                {d.properties.authors} ({d.properties.ref_year}).{" "}
                <i
                  onMouseEnter={() => activateFeature(d)}
                  onMouseOut={() => activateFeature({})}
                >
                  {d.properties.ref_title}
                </i>
                . {d.properties.ref_source}.{d.properties.isbn_doi}. Retrieved
                from{" "}
                <a
                  href={d.properties.url}
                  target="_blank"
                  onMouseEnter={() => activateFeature(d)}
                  onMouseOut={() => activateFeature({})}
                >
                  {d.properties.url}
                </a>
                .{" "}
              </p>
              <FeatureTable d={d} />
            </div>,
          ]
        );
      })}
    </div>
  );
};

export default FeatureList;
