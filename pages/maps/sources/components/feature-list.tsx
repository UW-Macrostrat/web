import h from "@macrostrat/hyper";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { Link } from "~/components";
import { useBurwellActions } from "#/map/sources/app-state";
import { zoomMap } from "../app-state/utils";

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
  const { geometry, properties } = feature;
  const { coordinates } = geometry;

  if (coordinates == null) {
    return null;
  }
  //                       lon      lat     zoom
  // #layers=bedrock,lines&x=5.012&y=29.031&z=1.45
  const zoom = zoomMap[properties.scale];
  const lat = (coordinates[0][0][1] + coordinates[0][2][1]) / 2;
  const long = (coordinates[0][0][0] + coordinates[0][2][0]) / 2;
  const to = `/map#layers=bedrock,lines&x=${long}&y=${lat}&z=${zoom}`;

  return <Link href={to}>View map</Link>;
}

function FeatureContent({ d, activateFeature }) {
  return (
    <div
      style={{ pointerEvents: "all" }}
      onMouseEnter={() => activateFeature(d)}
      onMouseLeave={() => activateFeature({})}
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

const FeatureList = ({ features, open = true }) => {
  const runAction = useBurwellActions();
  const activateFeature = (feature) => {
    runAction({ type: "activate-feature", activeFeature: feature });
  };

  return (
    <div
      className={`feature-list-container`}
      style={{
        visibility: open ? "visible" : "hidden",
        maxHeight: open ? "100%" : 0,
      }}
    >
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
